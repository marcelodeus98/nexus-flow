import { useQuery } from '@tanstack/react-query'
import { http } from '@/shared/api/http'

// Shape of GET /team-map. What comes back depends on who asks: admins see
// everyone; leaders their teams and managed projects; members the people they
// share a project with. Cards from projects the viewer is not in come only as
// a count (hiddenInProgress) and a timer without its card.

export type MapScope = 'ADMIN' | 'LEADER' | 'MEMBER'
export type PersonStatus = 'FOCUS' | 'ACTIVE' | 'IDLE'

export type MapCard = {
  id: string
  key: string
  number: number
  title: string
  type: 'TASK' | 'BUG'
  dueDate: string | null
  project: { key: string; name: string }
  column: string
}

export type MapPerson = {
  id: string
  name: string
  jobTitle: string | null
  departmentId: string | null
  teams: string[]
  isMe: boolean
  status: PersonStatus
  timer: { startedAt: string; card: MapCard | null } | null
  inProgress: MapCard[]
  hiddenInProgress: number
  openCards: number
  overdue: number
  todaySeconds: number
  lastActivityAt: string | null
  projectIds: string[]
}

export type TeamMap = {
  scope: MapScope
  generatedAt: string
  departments: { id: string; name: string; color: string }[]
  projects: { id: string; key: string; name: string }[]
  people: MapPerson[]
}

export function useTeamMap() {
  return useQuery({
    queryKey: ['team-map'],
    queryFn: () => http<TeamMap>('/team-map'),
    // "Ao vivo": timers start and stop, cards move.
    refetchInterval: 30_000,
  })
}
