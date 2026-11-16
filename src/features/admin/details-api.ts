import { useQuery } from '@tanstack/react-query'
import type { ProjectRole } from '@/features/projects/api'
import type { PersonStatus } from '@/features/team-map/api'
import { http } from '@/shared/api/http'
import type { ViewCard } from '@/shared/ui/view-drawer'

// Shapes of the admin "Visualizar" views: /users/:id/overview,
// /departments/:id/overview and /teams/:id/overview.

export type Work = {
  status: PersonStatus
  timer: { startedAt: string; card: ViewCard } | null
  inProgress: ViewCard[]
  openCards: number
  overdue: number
}

type AuditEntry = {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type UserOverview = {
  id: string
  name: string
  email: string
  jobTitle: string | null
  globalRole: 'ADMIN' | 'USER'
  isActive: boolean
  createdAt: string
  hasPassword: boolean
  department: { id: string; name: string; color: string } | null
  teams: { id: string; name: string; isLeader: boolean }[]
  ledTeams: { id: string; name: string }[]
  projects: {
    id: string
    key: string
    name: string
    status: 'ACTIVE' | 'ARCHIVED'
    role: ProjectRole
    direct: boolean
    teams: string[]
  }[]
  work: Work
  todaySeconds: number
  weekSeconds: number
  lastActivityAt: string | null
  activity: (AuditEntry & { entityType: string })[]
  history: (AuditEntry & { actor: string | null })[]
}

type Person = Work & {
  id: string
  name: string
  email: string
  jobTitle: string | null
  isActive: boolean
}

export type DepartmentOverview = {
  id: string
  name: string
  color: string
  isSystem: boolean
  people: Person[]
  totals: {
    people: number
    inactive: number
    focus: number
    active: number
    idle: number
    overdue: number
  }
}

export type TeamOverview = {
  id: string
  name: string
  description: string | null
  createdAt: string
  leader: { id: string; name: string } | null
  members: (Person & { department: { name: string; color: string } | null })[]
  projects: {
    id: string
    key: string
    name: string
    status: 'ACTIVE' | 'ARCHIVED'
    role: ProjectRole
  }[]
}

function useOverview<T>(kind: 'users' | 'departments' | 'teams', id: string | undefined) {
  return useQuery({
    queryKey: [kind, id, 'overview'],
    queryFn: () => http<T>(`/${kind}/${id}/overview`),
    enabled: Boolean(id),
  })
}

export function useUserOverview(id: string | undefined) {
  return useOverview<UserOverview>('users', id)
}

export function useDepartmentOverview(id: string | undefined) {
  return useOverview<DepartmentOverview>('departments', id)
}

export function useTeamOverview(id: string | undefined) {
  return useOverview<TeamOverview>('teams', id)
}
