import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/shared/api/http'

export type Methodology = 'SCRUM' | 'KANBAN' | 'HYBRID'
export type EstimateView = 'POINTS' | 'HOURS'
export type ProjectRole = 'MANAGER' | 'PRODUCT_OWNER' | 'DEVELOPER' | 'QA' | 'PROCESS' | 'VIEWER'
export type ProjectPermission =
  | 'project:edit'
  | 'board:configure'
  | 'sprint:manage'
  | 'backlog:prioritize'
  | 'card:create'
  | 'card:edit'
  | 'card:move'
  | 'card:validate'
  | 'time:log'
  | 'comment:create'
  | 'reports:view'
  | 'reports:view-own'
  | 'read'

export const roleLabels: Record<ProjectRole, string> = {
  MANAGER: 'Gestor',
  PRODUCT_OWNER: 'Product Owner',
  DEVELOPER: 'Desenvolvedor',
  QA: 'QA',
  PROCESS: 'Processos',
  VIEWER: 'Visualizador',
}

export const methodologyLabels: Record<Methodology, string> = {
  KANBAN: 'Kanban',
  SCRUM: 'Scrum',
  HYBRID: 'Híbrido',
}

export type Project = {
  id: string
  key: string
  name: string
  description: string | null
  methodology: Methodology
  status: 'ACTIVE' | 'ARCHIVED'
  defaultEstimateView: EstimateView
  defaultBoardId: string | null
  createdAt: string
}

export type ProjectListItem = Project & { myRole: ProjectRole | null }

export type ProjectMe = {
  role: ProjectRole | null
  isAdmin: boolean
  permissions: ProjectPermission[]
}

export type MemberUser = {
  id: string
  name: string
  email: string
  jobTitle: string | null
  isActive: boolean
}

export type ProjectMembers = {
  members: { user: MemberUser; role: ProjectRole; direct: boolean; teams: string[] }[]
  teams: { id: string; name: string; role: ProjectRole; memberCount: number }[]
}

export const projectKeys = {
  all: ['projects'] as const,
  // `ref` is the project's key (from the URL) or id.
  one: (ref: string) => ['projects', ref.toUpperCase()] as const,
  me: (ref: string) => ['projects', ref.toUpperCase(), 'me'] as const,
  members: (projectId: string) => ['projects', projectId, 'members'] as const,
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
})

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: () => http<ProjectListItem[]>('/projects'),
  })
}

export function useProject(ref: string) {
  return useQuery({
    queryKey: projectKeys.one(ref),
    queryFn: () => http<Project>(`/projects/${ref}`),
  })
}

export function useProjectMe(ref: string) {
  return useQuery({
    queryKey: projectKeys.me(ref),
    queryFn: () => http<ProjectMe>(`/projects/${ref}/me`),
  })
}

// `can('card:move')` hides or disables actions the API would refuse anyway.
export function useCan(ref: string) {
  const me = useProjectMe(ref)
  return (permission: ProjectPermission) => me.data?.permissions.includes(permission) ?? false
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.members(projectId ?? ''),
    queryFn: () => http<ProjectMembers>(`/projects/${projectId}/members`),
    enabled: Boolean(projectId),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      key: string
      name: string
      description?: string
      methodology: Methodology
      defaultEstimateView: EstimateView
    }) => http<Project>('/projects', json('POST', input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

export function useUpdateProject(project: Project) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: Partial<Pick<Project, 'name' | 'description' | 'methodology' | 'defaultEstimateView'>>,
    ) => http<Project>(`/projects/${project.id}`, json('PATCH', input)),
    onSuccess: (updated) => {
      queryClient.setQueryData(projectKeys.one(project.key), updated)
      return queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true })
    },
  })
}

export function useSetArchived(project: Project) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (archived: boolean) =>
      http<Project>(`/projects/${project.id}/${archived ? 'archive' : 'unarchive'}`, {
        method: 'POST',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

export function useSetMembers(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (members: { userId: string; role: ProjectRole }[]) =>
      http<ProjectMembers>(`/projects/${projectId}/members`, json('PUT', { members })),
    onSuccess: (members) => {
      queryClient.setQueryData(projectKeys.members(projectId), members)
      return queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useSetTeams(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (teams: { teamId: string; role: ProjectRole }[]) =>
      http<ProjectMembers>(`/projects/${projectId}/teams`, json('PUT', { teams })),
    onSuccess: (members) => {
      queryClient.setQueryData(projectKeys.members(projectId), members)
      return queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}
