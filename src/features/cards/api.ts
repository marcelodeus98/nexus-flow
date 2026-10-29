import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  removeCard,
  upsertCard,
  type CardDepartmentRole,
  type CardPriority,
  type CardSummary,
} from '@/features/board/api'
import { http } from '@/shared/api/http'

export type CardDetail = CardSummary & {
  description: Record<string, unknown> | null
  createdAt: string
  createdBy: { id: string; name: string } | null
  watcherIds: string[]
  parent: { id: string; number: number; title: string } | null
  children: { id: string; number: number; title: string; columnId: string }[]
  checklist: ChecklistItem[]
}

export type ChecklistItem = {
  id: string
  title: string
  done: boolean
  kind: 'GENERAL' | 'QA'
  rank: string
}

export type CardPatch = Partial<{
  title: string
  description: Record<string, unknown> | null
  priority: CardPriority
  storyPoints: number | null
  estimateMinutes: number | null
  dueDate: string | null
  parentId: string | null
  assigneeIds: string[]
  tagIds: string[]
  departments: { departmentId: string; role: CardDepartmentRole }[]
}>

export type ActivityEntry = {
  id: string
  action: string
  actor: { id: string; name: string | null } | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export const cardKeys = {
  // Keyed by id once known, so socket events can invalidate it.
  byNumber: (projectId: string, number: number) => ['cards', 'number', projectId, number] as const,
  activity: (cardId: string) => ['cards', cardId, 'activity'] as const,
  comments: (cardId: string) => ['cards', cardId, 'comments'] as const,
  attachments: (cardId: string) => ['cards', cardId, 'attachments'] as const,
  time: (cardId: string) => ['cards', cardId, 'time'] as const,
}

export function useCardByNumber(projectId: string, number: number) {
  return useQuery({
    queryKey: cardKeys.byNumber(projectId, number),
    queryFn: () => http<CardDetail>(`/projects/${projectId}/cards/${number}`),
  })
}

export function useCardActivity(cardId: string | undefined) {
  return useQuery({
    queryKey: cardKeys.activity(cardId ?? ''),
    queryFn: () => http<ActivityEntry[]>(`/cards/${cardId}/activity`),
    enabled: Boolean(cardId),
  })
}

// Every edit carries the version it was based on (If-Match): if someone else
// changed the card meanwhile, the API answers 412 and nothing is overwritten.
export function useUpdateCard(projectId: string, card: CardDetail | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: CardPatch) =>
      http<CardDetail>(`/cards/${card!.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
        headers: { 'If-Match': `"${card!.version}"` },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(cardKeys.byNumber(projectId, updated.number), updated)
      upsertCard(queryClient, projectId, updated)
      return queryClient.invalidateQueries({ queryKey: cardKeys.activity(updated.id) })
    },
    // 412 (someone else edited it) or any failure: show what the server has.
    onError: () =>
      card &&
      queryClient.invalidateQueries({ queryKey: cardKeys.byNumber(projectId, card.number) }),
  })
}

export function useDeleteCard(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cardId: string) => http<void>(`/cards/${cardId}`, { method: 'DELETE' }),
    onSuccess: (_result, cardId) => removeCard(queryClient, projectId, cardId),
  })
}

export function useSetWatching(projectId: string, card: CardDetail | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (watching: boolean) =>
      http<void>(`/cards/${card!.id}/watch`, { method: watching ? 'POST' : 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: cardKeys.byNumber(projectId, card!.number) }),
  })
}
