import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BugSeverity } from '@/features/qa/bug-severity'
import type { ExportItem } from '@/features/reports/api'
import { http } from '@/shared/api/http'

// Shapes of /team-reports and /reports/overview.

export type ReportTeam = {
  id: string
  name: string
  leader: { id: string; name: string } | null
  memberCount: number
}

export type Period = { from: string; to: string }

type BySeverity = Record<BugSeverity, number>

export type TeamMemberRow = {
  id: string
  name: string
  email: string
  jobTitle: string | null
  isActive: boolean
  isLeader: boolean
  seconds: number
  entries: number
  cardsDone: number
  pointsDone: number
  estimateMinutesDone: number
  actualMinutesDone: number
  deviationPct: number | null
  openCards: number
  inProgress: number
  overdue: number
  openBugs: number
  approvalsReceived: number
  rejectionsReceived: number
  rejectionRate: number | null
  approvedCards: number
  firstPassYield: number | null
  avgRework: number | null
  approvalsGiven: number
  rejectionsGiven: number
  testsPassed: number
  testsFailed: number
  testsBlocked: number
  bugsReported: number
  bugsFoundInTheirCards: number
}

export type TeamReport = {
  team: {
    id: string
    name: string
    description: string | null
    leader: { id: string; name: string } | null
  }
  filter: Period & { projectId?: string }
  totals: {
    members: number
    seconds: number
    entries: number
    cardsDone: number
    pointsDone: number
    estimateMinutesDone: number
    actualMinutesDone: number
    deviationPct: number | null
    openCards: number
    inProgress: number
    overdue: number
    openBugs: number
  }
  quality: {
    reviews: number
    approved: number
    rejected: number
    rejectionRate: number | null
    firstPassYield: number | null
    avgRework: number | null
    tests: { passed: number; failed: number; blocked: number }
    bugsReported: number
    bugsReportedBySeverity: BySeverity
    bugsFoundInTeamCards: number
    bugsFoundBySeverity: BySeverity
  }
  members: TeamMemberRow[]
  leaderIsMember: boolean
  projects: {
    id: string
    key: string
    name: string
    status: 'ACTIVE' | 'ARCHIVED'
    seconds: number
    cardsDone: number
    openCards: number
  }[]
  days: { day: string; seconds: number }[]
}

type Work = { seconds: number; cardsDone: number; openCards: number; overdue: number }

export type Overview = {
  filter: Period
  totals: {
    projects: number
    people: number
    teams: number
    seconds: number
    cardsDone: number
    openCards: number
    overdue: number
    openBugs: number
    reviews: number
    rejectionRate: number | null
  }
  projects: (Work & {
    id: string
    key: string
    name: string
    methodology: 'SCRUM' | 'KANBAN' | 'HYBRID'
    members: number
    activeSprint: { name: string; endDate: string } | null
    inProgress: number
    openBugs: number
    bugsFixed: number
    approved: number
    rejected: number
    rejectionRate: number | null
  })[]
  teams: (Work & {
    id: string
    name: string
    leader: { id: string; name: string } | null
    members: number
  })[]
  people: (Work & {
    id: string
    name: string
    jobTitle: string | null
    department: string | null
  })[]
  days: { day: string; seconds: number }[]
}

export const teamReportKeys = { all: ['team-reports'] as const }

const query = (params: Record<string, string | undefined>) =>
  new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString()

// The teams the user leads (every team for admins). Empty hides the menu.
export function useReportTeams(enabled = true) {
  return useQuery({
    queryKey: [...teamReportKeys.all, 'teams'],
    queryFn: () => http<ReportTeam[]>('/team-reports/teams'),
    enabled,
  })
}

export function useTeamReport(teamId: string | undefined, filter: Period & { projectId?: string }) {
  return useQuery({
    queryKey: [...teamReportKeys.all, teamId, filter],
    queryFn: () => http<TeamReport>(`/team-reports/${teamId}?${query(filter)}`),
    enabled: Boolean(teamId),
    placeholderData: keepPreviousData,
  })
}

export function useOverview(filter: Period) {
  return useQuery({
    queryKey: ['reports', 'overview', filter],
    queryFn: () => http<Overview>(`/reports/overview?${query(filter)}`),
    placeholderData: keepPreviousData,
  })
}

export function useExportTeamReport(teamId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Period & { projectId?: string; format: ExportItem['format'] }) =>
      http<ExportItem>(`/team-reports/${teamId}/export`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exports'] }),
  })
}
