import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/shared/api/http'

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED'
export type SprintOutcome = 'COMPLETED' | 'CARRIED_OVER' | 'RETURNED_TO_BACKLOG' | 'REMOVED'

export type Sprint = {
  id: string
  projectId: string
  name: string
  goal: string | null
  // Calendar days, YYYY-MM-DD.
  startDate: string
  endDate: string
  status: SprintStatus
  startedAt: string | null
  closedAt: string | null
  cardCount: number
}

export type SprintTotals = {
  remainingPoints: number
  completedPoints: number
  remainingMinutes: number
  completedMinutes: number
}

export type SprintHistoryEntry = {
  addedAt: string
  removedAt: string | null
  outcome: SprintOutcome | null
  nextSprintId: string | null
  pointsAtStart: number | null
  pointsAtEnd: number | null
  minutesAtStart: number | null
  minutesAtEnd: number | null
  timeSpentMinutes: number | null
  columnAtClose: string | null
  addedLate: boolean
  card: { id: string; number: number; title: string; deleted: boolean }
}

export type SprintDetail = Sprint & { totals: SprintTotals; history: SprintHistoryEntry[] }

export type Burndown = {
  sprint: Sprint
  // Committed estimate when the sprint started.
  scope: { points: number; minutes: number }
  days: { date: string; value: SprintTotals | null }[]
}

export const sprintKeys = {
  list: (projectId: string) => ['sprints', projectId] as const,
  one: (sprintId: string) => ['sprint', sprintId] as const,
  burndown: (sprintId: string) => ['sprint', sprintId, 'burndown'] as const,
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body !== undefined && { body: JSON.stringify(body) }),
})

export function useSprints(projectId: string) {
  return useQuery({
    queryKey: sprintKeys.list(projectId),
    queryFn: () => http<Sprint[]>(`/projects/${projectId}/sprints`),
  })
}

export function useSprint(sprintId: string) {
  return useQuery({
    queryKey: sprintKeys.one(sprintId),
    queryFn: () => http<SprintDetail>(`/sprints/${sprintId}`),
  })
}

export function useBurndown(sprintId: string) {
  return useQuery({
    queryKey: sprintKeys.burndown(sprintId),
    queryFn: () => http<Burndown>(`/sprints/${sprintId}/burndown`),
  })
}

// Sprint changes ripple into the board (cards' sprintId), so both refresh;
// socket events do the same for everyone else.
function useSprintMutation<TInput, TResult>(
  projectId: string,
  request: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['sprint'] }),
        queryClient.invalidateQueries({ queryKey: ['board', projectId] }),
      ]),
  })
}

export function useSaveSprint(projectId: string) {
  return useSprintMutation(
    projectId,
    ({
      id,
      ...input
    }: {
      id?: string
      name: string
      goal: string | null
      startDate: string
      endDate: string
    }) =>
      id
        ? http<Sprint>(`/sprints/${id}`, json('PATCH', input))
        : http<Sprint>(`/projects/${projectId}/sprints`, json('POST', input)),
  )
}

export function useDeleteSprint(projectId: string) {
  return useSprintMutation(projectId, (id: string) =>
    http<void>(`/sprints/${id}`, { method: 'DELETE' }),
  )
}

export function useStartSprint(projectId: string) {
  return useSprintMutation(projectId, (id: string) =>
    http<Sprint>(`/sprints/${id}/start`, json('POST')),
  )
}

export function useCloseSprint(projectId: string) {
  return useSprintMutation(
    projectId,
    ({ id, nextSprintId }: { id: string; nextSprintId: string | null }) =>
      http<Sprint>(
        `/sprints/${id}/close`,
        json(
          'POST',
          nextSprintId ? { unfinished: 'SPRINT', nextSprintId } : { unfinished: 'BACKLOG' },
        ),
      ),
  )
}

export function useSetSprintCards(projectId: string) {
  return useSprintMutation(
    projectId,
    ({ sprintId, add, remove }: { sprintId: string; add?: string[]; remove?: string[] }) =>
      http<SprintDetail>(`/sprints/${sprintId}/cards`, json('POST', { add, remove })),
  )
}

export const statusLabels: Record<SprintStatus, string> = {
  PLANNED: 'Planejada',
  ACTIVE: 'Em andamento',
  CLOSED: 'Encerrada',
}

export function formatDay(day: string) {
  const [, month, date] = day.split('-')
  return `${date}/${month}`
}
