import { Badge, Group, Stack, Tabs, Text, Title } from '@mantine/core'
import { IconArchive } from '@tabler/icons-react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useProjectRealtime } from '@/features/board/use-project-realtime'
import { ApiError } from '@/shared/api/http'
import { apiErrorMessage } from '@/shared/api/errors'
import { useCan, useProject } from './api'

// Shell of /p/:projectKey: header, tabs and the realtime subscription shared
// by the board and the settings.
export function ProjectLayout() {
  const { projectKey = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const project = useProject(projectKey)
  const can = useCan(projectKey)
  useProjectRealtime(project.data?.id, project.data?.key)

  if (project.isPending)
    return (
      <Text size="sm" c="dimmed">
        Carregando…
      </Text>
    )
  if (project.isError) {
    const notFound = project.error instanceof ApiError && project.error.status === 404
    return (
      <Text size="sm" c="red">
        {notFound ? 'Projeto não encontrado ou sem acesso.' : apiErrorMessage(project.error)}
      </Text>
    )
  }

  const section = location.pathname.split('/')[3] ?? ''
  const onSettings = section === 'settings'
  const onBacklog = section === 'backlog' || section === 'sprints'
  const onReports = section === 'reports'
  const onTests = section === 'tests'
  const tabs = [
    {
      to: `/p/${project.data.key}`,
      label: 'Board',
      active: !onSettings && !onBacklog && !onReports && !onTests,
      show: true,
    },
    {
      to: `/p/${project.data.key}/backlog`,
      label: 'Backlog e sprints',
      active: onBacklog,
      show: project.data.methodology !== 'KANBAN',
    },
    {
      to: `/p/${project.data.key}/tests`,
      label: 'Casos de teste',
      active: onTests,
      show: true,
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

  const visibleTabs = tabs.filter((tab) => tab.show)
  const activeTab = visibleTabs.find((tab) => tab.active)?.to ?? null

  return (
    <Stack gap="md">
      <Group gap="md" wrap="wrap">
        <Title order={2}>
          <Group gap="xs" component="span">
            <Badge variant="light" radius="sm" size="lg" ff="monospace">
              {project.data.key}
            </Badge>
            {project.data.name}
          </Group>
        </Title>
        {project.data.status === 'ARCHIVED' && (
          <Group gap={4}>
            <IconArchive size={16} aria-hidden color="var(--nexa-slate)" />
            <Text size="sm" c="dimmed">
              Arquivado (somente leitura)
            </Text>
          </Group>
        )}
      </Group>
      <Tabs value={activeTab} onChange={(to) => to && void navigate(to)}>
        <Tabs.List>
          {visibleTabs.map((tab) => (
            <Tabs.Tab key={tab.to} value={tab.to}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      <Outlet context={project.data} />
    </Stack>
  )
}
