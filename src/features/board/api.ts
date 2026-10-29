import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { generateKeyBetween } from 'fractional-indexing'
import { http } from '@/shared/api/http'

export type ColumnCategory = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED'
export type CardPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type CardDepartmentRole = 'ORIGIN' | 'TARGET' | 'INVOLVED'

export const categoryLabels: Record<ColumnCategory, string> = {
  BACKLOG: 'Backlog',
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  REVIEW: 'Revisão',
  DONE: 'Concluído',
  BLOCKED: 'Bloqueado',
}

export const priorityLabels: Record<CardPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export type BoardColumn = {
  id: string
  name: string
  rank: string
  category: ColumnCategory
  wipLimit: number | null
}

export type CardSummary = {
  id: string
  number: number
  title: string
  priority: CardPriority
  storyPoints: number | null
  estimateMinutes: number | null
  dueDate: string | null
  columnId: string
  rank: string
  sprintId: string | null
  parentId: string | null
  version: number
  updatedAt: string
  assigneeIds: string[]
  tagIds: string[]
  departments: { departmentId: string; role: CardDepartmentRole }[]
  checklistTotal: number
  checklistDone: number
}

export type Board = {
  board: { id: string; name: string }
  columns: BoardColumn[]
  cards: CardSummary[]
}

export type Tag = { id: string; name: string; color: string; projectId: string | null }

export const boardKeys = {
  board: (projectId: string) => ['board', projectId] as const,
  tags: (projectId: string) => ['tags', projectId] as const,
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
})

export function useBoard(projectId: string) {
  return useQuery({
    queryKey: boardKeys.board(projectId),
    queryFn: () => http<Board>(`/projects/${projectId}/board`),
  })
}

export function useTags(projectId: string) {
  return useQuery({
    queryKey: boardKeys.tags(projectId),
    queryFn: () => http<Tag[]>(`/projects/${projectId}/tags`),
    staleTime: 5 * 60_000,
  })
}

// Ranks compare byte by byte (the API stores them with COLLATE "C");
// JavaScript's < on these ASCII keys gives the same order.
export const byRank = (a: { rank: string; id: string }, b: { rank: string; id: string }) =>
  a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : a.id < b.id ? -1 : 1

// A socket event or a mutation result. Older versions than what the cache
// holds are dropped, so a late echo never undoes a newer change.
export function upsertCard(queryClient: QueryClient, projectId: string, card: CardSummary) {
  queryClient.setQueryData<Board>(boardKeys.board(projectId), (board) => {
    if (!board) return board
    const current = board.cards.find((c) => c.id === card.id)
    if (current && current.version > card.version) return board
    const cards = current
      ? board.cards.map((c) => (c.id === card.id ? card : c))
      : [...board.cards, card]
    return { ...board, cards: cards.sort(byRank) }
  })
}

export function removeCard(queryClient: QueryClient, projectId: string, cardId: string) {
  queryClient.setQueryData<Board>(boardKeys.board(projectId), (board) =>
    board ? { ...board, cards: board.cards.filter((c) => c.id !== cardId) } : board,
  )
}

export type MoveInput = {
  cardId: string
  columnId: string
  afterId?: string
  beforeId?: string
}

// The card jumps at once, with a provisional rank between its new neighbours
// (same algorithm as the API, so it usually matches). The cache is updated
// synchronously, before the request, so the dropped card never flickers back.
// On failure the server's board is restored and `onError` gets the error.
export function useMoveCard(projectId: string, onError: (error: unknown) => void) {
  const queryClient = useQueryClient()
  const key = boardKeys.board(projectId)
  const mutation = useMutation({
    mutationFn: ({ cardId, ...body }: MoveInput) =>
      http<CardSummary>(`/cards/${cardId}/move`, json('POST', body)),
    onSuccess: (card) => upsertCard(queryClient, projectId, card),
    onError: (error) => {
      onError(error)
      return queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return (input: MoveInput) => {
    void queryClient.cancelQueries({ queryKey: key })
    queryClient.setQueryData<Board>(key, (board) => {
      if (!board) return board
      const { cardId, columnId, afterId, beforeId } = input
      const rankOf = (id?: string) => board.cards.find((c) => c.id === id)?.rank ?? null
      let after = rankOf(afterId)
      const before = rankOf(beforeId)
      if (!afterId && !beforeId) {
        after =
          board.cards.filter((c) => c.columnId === columnId && c.id !== cardId).at(-1)?.rank ?? null
      }
      let rank: string
      try {
        rank = generateKeyBetween(after, before)
      } catch {
        return board
      }
      const cards = board.cards.map((c) => (c.id === cardId ? { ...c, columnId, rank } : c))
      return { ...board, cards: cards.sort(byRank) }
    })
    mutation.mutate(input)
  }
}

export function useCreateCard(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { title: string; columnId: string }) =>
      http<CardSummary>(`/projects/${projectId}/cards`, json('POST', input)),
    onSuccess: (card) => upsertCard(queryClient, projectId, card),
  })
}
