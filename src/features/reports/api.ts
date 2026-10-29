import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/shared/api/http'

export type GroupBy = 'user' | 'card' | 'sprint' | 'day'

export type TimeReport = {
  filter: { from: string; to: string; groupBy: GroupBy; onlyOwn: boolean }
  totalSeconds: number
  rows: { key: string; label: string; seconds: number; entries: number }[]
}

export type EstimateVsActual = {
  totals: { estimateMinutes: number; actualMinutesOnEstimated: number; actualMinutes: number }
  rows: {
    cardId: string
    number: number
    title: string
    column: string
    done: boolean
    storyPoints: number | null
    estimateMinutes: number | null
    actualMinutes: number
    deviationPct: number | null
  }[]
}

export type ExportStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'

export type ExportItem = {
  id: string
  kind: 'TIME_ENTRIES' | 'ESTIMATE_VS_ACTUAL'
  format: 'CSV' | 'XLSX'
  status: ExportStatus
  rowCount: number | null
  fileName: string | null
  error: string | null
  createdAt: string
  finishedAt: string | null
  expiresAt: string | null
}

export type RangeFilter = { from: string; to: string; sprintId?: string }

const query = (params: Record<string, string | undefined>) =>
  new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString()

export function useTimeReport(projectId: string, filter: RangeFilter & { groupBy: GroupBy }) {
  return useQuery({
    queryKey: ['reports', projectId, 'time', filter],
    queryFn: () => http<TimeReport>(`/projects/${projectId}/reports/time?${query(filter)}`),
  })
}

export function useEstimateVsActual(
  projectId: string,
  sprintId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['reports', projectId, 'estimate', sprintId],
    queryFn: () =>
      http<EstimateVsActual>(
        `/projects/${projectId}/reports/estimate-vs-actual?${query({ sprintId })}`,
      ),
    enabled,
  })
}

// Polls while something is still being produced.
export function useExports() {
  return useQuery({
    queryKey: ['exports'],
    queryFn: () => http<ExportItem[]>('/exports'),
    refetchInterval: (q) =>
      q.state.data?.some((e) => e.status === 'PENDING' || e.status === 'RUNNING') ? 2000 : false,
  })
}

export function useRequestExport(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RangeFilter & { kind: ExportItem['kind']; format: ExportItem['format'] }) =>
      http<ExportItem>(`/projects/${projectId}/reports/export`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exports'] }),
  })
}

export async function downloadExport(id: string) {
  const { url } = await http<{ url: string }>(`/exports/${id}/download`)
  window.location.assign(url)
}

export const formatHours = (seconds: number) => {
  const hours = seconds / 3600
  return hours >= 10 ? `${Math.round(hours)} h` : `${Math.round(hours * 10) / 10} h`
}
