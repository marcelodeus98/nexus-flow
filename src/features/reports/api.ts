import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BugSeverity } from '@/features/qa/bug-severity'
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
  kind: 'TIME_ENTRIES' | 'ESTIMATE_VS_ACTUAL' | 'QUALITY'
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

type BySeverity = Record<BugSeverity, number>

// Aggregates for the project, a sprint or a period (never per person).
export type QualityReport = {
  reviews: { total: number; approved: number; rejected: number; rejectionRate: number | null }
  firstPassYield: number | null
  avgRework: number | null
  timeInTesting: { passages: number; avgHours: number | null; medianHours: number | null }
  bugs: {
    created: number
    createdBySeverity: BySeverity
    open: number
    openBySeverity: BySeverity
    fixed: number
    avgHoursToFix: number | null
  }
  tests: { passed: number; failed: number; blocked: number }
  weeks: { week: string; approved: number; rejected: number; bugs: number }[]
  sprints: {
    id: string
    name: string
    status: 'PLANNED' | 'ACTIVE' | 'CLOSED'
    startDate: string
    endDate: string
    approved: number
    rejected: number
    bugs: number
  }[]
}

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

export function useQualityReport(projectId: string, filter: RangeFilter, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', projectId, 'quality', filter],
    queryFn: () => http<QualityReport>(`/projects/${projectId}/reports/quality?${query(filter)}`),
    enabled,
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
