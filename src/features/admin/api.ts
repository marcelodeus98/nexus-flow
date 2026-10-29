import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { http } from '@/shared/api/http'

// Shapes of /users, /departments and /teams. They move to the orval client
// generated from the OpenAPI document when it lands.

export type GlobalRole = 'ADMIN' | 'USER'

export type User = {
  id: string
  name: string
  email: string
  jobTitle: string | null
  globalRole: GlobalRole
  isActive: boolean
  departmentId: string | null
  department: { id: string; name: string; color: string } | null
  hasPassword: boolean
  hasGoogle: boolean
  createdAt: string
}

export type UserInput = {
  name: string
  email: string
  jobTitle: string | null
  departmentId: string | null
  globalRole: GlobalRole
  password?: string
}

export type Department = {
  id: string
  name: string
  color: string
  isSystem: boolean
  userCount: number
}

export type TeamSummary = {
  id: string
  name: string
  description: string | null
  memberCount: number
}

export type TeamMember = Pick<User, 'id' | 'name' | 'email' | 'jobTitle' | 'isActive'>

export type Team = Omit<TeamSummary, 'memberCount'> & { members: TeamMember[] }

type Page<T> = { items: T[]; nextCursor: string | null }

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
})

export const adminKeys = {
  users: ['users'] as const,
  departments: ['departments'] as const,
  teams: ['teams'] as const,
}

export function useUsers(filters: { search: string; includeInactive: boolean }) {
  return useInfiniteQuery({
    queryKey: [...adminKeys.users, filters],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' })
      if (filters.search) params.set('search', filters.search)
      if (filters.includeInactive) params.set('includeInactive', 'true')
      if (pageParam) params.set('cursor', pageParam)
      return http<Page<User>>(`/users?${params.toString()}`)
    },
    initialPageParam: '',
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}

// Every active user, for pickers. The company has a few dozen people, so one
// page of 100 covers it; a server-side search replaces this if that changes.
export function useActiveUsers() {
  return useQuery({
    queryKey: [...adminKeys.users, 'active'],
    queryFn: async () => (await http<Page<User>>('/users?limit=100')).items,
  })
}

export function useDepartments() {
  return useQuery({
    queryKey: adminKeys.departments,
    queryFn: () => http<Department[]>('/departments'),
  })
}

export function useTeams() {
  return useQuery({ queryKey: adminKeys.teams, queryFn: () => http<TeamSummary[]>('/teams') })
}

export function useTeam(id: string | undefined) {
  return useQuery({
    queryKey: [...adminKeys.teams, id],
    queryFn: () => http<Team>(`/teams/${id}`),
    enabled: Boolean(id),
  })
}

// A mutation that refreshes the given lists once it succeeds.
function useAdminMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  invalidates: QueryKey[],
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all(invalidates.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

export function useSaveUser() {
  return useAdminMutation(
    ({ id, ...input }: Partial<UserInput> & { id?: string }) =>
      id
        ? http<User>(`/users/${id}`, json('PATCH', input))
        : http<User>('/users', json('POST', input)),
    [adminKeys.users, adminKeys.departments, adminKeys.teams],
  )
}

export function useSetUserStatus() {
  return useAdminMutation(
    ({ id, isActive }: { id: string; isActive: boolean }) =>
      http<User>(`/users/${id}/status`, json('PATCH', { isActive })),
    [adminKeys.users, adminKeys.departments, adminKeys.teams],
  )
}

export function useSaveDepartment() {
  return useAdminMutation(
    ({ id, ...input }: { id?: string; name: string; color: string }) =>
      id
        ? http<Department>(`/departments/${id}`, json('PATCH', input))
        : http<Department>('/departments', json('POST', input)),
    [adminKeys.departments, adminKeys.users],
  )
}

export function useDeleteDepartment() {
  return useAdminMutation(
    (id: string) => http<void>(`/departments/${id}`, { method: 'DELETE' }),
    [adminKeys.departments, adminKeys.users],
  )
}

export function useSaveTeam() {
  return useAdminMutation(
    ({ id, ...input }: { id?: string; name: string; description: string | null }) =>
      id
        ? http<Team>(`/teams/${id}`, json('PATCH', input))
        : http<Team>('/teams', json('POST', input)),
    [adminKeys.teams],
  )
}

export function useDeleteTeam() {
  return useAdminMutation(
    (id: string) => http<void>(`/teams/${id}`, { method: 'DELETE' }),
    [adminKeys.teams],
  )
}

export function useSetTeamMembers() {
  return useAdminMutation(
    ({ id, userIds }: { id: string; userIds: string[] }) =>
      http<Team>(`/teams/${id}/members`, json('PUT', { userIds })),
    [adminKeys.teams],
  )
}
