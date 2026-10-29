import { ArchiveIcon } from 'lucide-react'
import { Link, Outlet, useLocation, useParams } from 'react-router'
import { useProjectRealtime } from '@/features/board/use-project-realtime'
import { ApiError } from '@/shared/api/http'
import { apiErrorMessage } from '@/shared/api/errors'
import { useCan, useProject } from './api'

// Shell of /p/:projectKey: header, tabs and the realtime subscription shared
// by the board and the settings.
export function ProjectLayout() {
  const { projectKey = '' } = useParams()
  const location = useLocation()
  const project = useProject(projectKey)
  const can = useCan(projectKey)
  useProjectRealtime(project.data?.id, project.data?.key)

  if (project.isPending) return <p className="text-sm text-muted-foreground">Carregando…</p>
  if (project.isError) {
    const notFound = project.error instanceof ApiError && project.error.status === 404
    return (
      <p className="text-sm text-destructive">
        {notFound ? 'Projeto não encontrado ou sem acesso.' : apiErrorMessage(project.error)}
      </p>
    )
  }

  const section = location.pathname.split('/')[3] ?? ''
  const onSettings = section === 'settings'
  const onBacklog = section === 'backlog' || section === 'sprints'
  const onReports = section === 'reports'
  const tabs = [
    {
      to: `/p/${project.data.key}`,
      label: 'Board',
      active: !onSettings && !onBacklog && !onReports,
      show: true,
    },
    {
      to: `/p/${project.data.key}/backlog`,
      label: 'Backlog e sprints',
      active: onBacklog,
      show: project.data.methodology !== 'KANBAN',
    },
    {
      to: `/p/${project.data.key}/reports`,
      label: 'Relatórios',
      active: onReports,
      show: can('reports:view-own'),
    },
    {
      to: `/p/${project.data.key}/settings`,
      label: 'Configurações',
      active: onSettings,
      show: can('project:edit') || can('board:configure'),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            {project.data.key}
          </span>
          {project.data.name}
        </h1>
        {project.data.status === 'ARCHIVED' && (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <ArchiveIcon className="size-4" aria-hidden /> Arquivado (somente leitura)
          </span>
        )}
        <nav className="flex gap-1">
          {tabs
            .filter((tab) => tab.show)
            .map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={tab.active ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  tab.active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </Link>
            ))}
        </nav>
      </div>
      <Outlet context={project.data} />
    </div>
  )
}
