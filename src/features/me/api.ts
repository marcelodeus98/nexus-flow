import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { BugSeverity } from '@/features/qa/bug-severity'
import { http } from '@/shared/api/http'

// Shapes of /me/profile and /me/daily: always about the signed-in person.

export type Profile = {
  id: string
  name: string
  email: string
  jobTitle: string | null
  globalRole: 'ADMIN' | 'USER'
  createdAt: string
  department: { name: string; color: string } | null
  teams: { id: string; name: string; isLeader: boolean }[]
  // Teams they lead without being a member.
  ledTeams: { id: string; name: string }[]
}

export type DailyCard = {
  id: string
  key: string
  number: number
  title: string
  type: 'TASK' | 'BUG'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | null
  qaStatus: 'APPROVED' | 'REJECTED' | null
  storyPoints: number | null
  project: { key: string; name: string }
  column: string
  category: string
  // The active sprint's name, when the card is in it.
  sprint: string | null
  severity: BugSeverity | null
}

export type ActivityCard = DailyCard & {
  seconds: number
  moves: { from: string; to: string }[]
  reviews: ('APPROVED' | 'REJECTED')[]
  completed: boolean
}

export type Activity = { seconds: number; completed: ActivityCard[]; worked: ActivityCard[] }

export type Daily = {
  date: string
  previousDate: string
  previous: Activity
  today: Activity & { running: { startedAt: string; card: DailyCard } | null }
  open: { total: number; inProgress: DailyCard[]; todo: DailyCard[]; backlog: DailyCard[] }
  attention: {
    overdue: DailyCard[]
    dueToday: DailyCard[]
    rejected: DailyCard[]
    openBugs: DailyCard[]
  }
}

export function useProfile() {
  return useQuery({ queryKey: ['me', 'profile'], queryFn: () => http<Profile>('/me/profile') })
}

export function useDaily(date: string) {
  return useQuery({
    queryKey: ['me', 'daily', date],
    queryFn: () => http<Daily>(`/me/daily?date=${date}`),
    placeholderData: keepPreviousData,
    // The day moves on while the page is open (timer, moves).
    refetchInterval: 60_000,
  })
}
