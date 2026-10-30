import {
  Anchor,
  Badge,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCurrentProject } from '@/features/projects/project-context'
import { apiErrorMessage } from '@/shared/api/errors'
import { formatDay, statusLabels, useBurndown, useSprint, type SprintOutcome } from './api'
import { BurndownChart, type BurndownUnit } from './burndown-chart'

const outcomeLabels: Record<SprintOutcome, string> = {
  COMPLETED: 'Concluído',
  CARRIED_OVER: 'Passou para a próxima',
  RETURNED_TO_BACKLOG: 'Voltou ao backlog',
  REMOVED: 'Retirado',
}

export function SprintReportPage() {
  const project = useCurrentProject()
  const { sprintId = '' } = useParams()
  const sprint = useSprint(sprintId)
  const burndown = useBurndown(sprintId)
  const [unit, setUnit] = useState<BurndownUnit>(
    project.defaultEstimateView === 'HOURS' ? 'hours' : 'points',
  )

  if (sprint.isPending)
    return (
      <Text size="sm" c="dimmed">
        Carregando…
      </Text>
    )
  if (sprint.isError)
    return (
      <Text size="sm" c="red">
        {apiErrorMessage(sprint.error)}
      </Text>
    )

  const s = sprint.data
  const committed = s.history.filter((h) => !h.addedLate)
  const late = s.history.filter((h) => h.addedLate)
  const completed = s.history.filter((h) => h.outcome === 'COMPLETED')
  const spent = s.history.reduce((sum, h) => sum + (h.timeSpentMinutes ?? 0), 0)
  const points = (list: typeof s.history) =>
    list.reduce((sum, h) => sum + (h.pointsAtEnd ?? h.pointsAtStart ?? 0), 0)

  const figures = [
    {
      label: 'Compromisso inicial',
      value: `${committed.length} cards`,
      detail: `${points(committed)} pts`,
    },
    {
      label: 'Entrou depois do início',
      value: `${late.length} cards`,
      detail: `${points(late)} pts`,
    },
    {
      label: s.status === 'CLOSED' ? 'Concluído' : 'Concluído até agora',
      value:
        s.status === 'CLOSED' ? `${completed.length} cards` : `${s.totals.completedPoints} pts`,
      detail:
        s.status === 'CLOSED'
          ? `${points(completed)} pts`
          : `${s.totals.remainingPoints} pts restantes`,
    },
    {
      label: 'Tempo registrado',
      value: s.status === 'CLOSED' ? `${Math.round((spent / 60) * 10) / 10} h` : '—',
      detail: s.status === 'CLOSED' ? 'nos cards da sprint' : 'calculado no encerramento',
    },
  ]

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Anchor component={Link} to={`/p/${project.key}/backlog`} size="sm">
          <Group gap={4} component="span">
            <IconArrowLeft size={14} /> Backlog
          </Group>
        </Anchor>
        <Group gap="xs">
          <Title order={3}>{s.name}</Title>
          <Badge
            variant={s.status === 'ACTIVE' ? 'filled' : 'light'}
            color={s.status === 'ACTIVE' ? undefined : 'gray'}
          >
            {statusLabels[s.status]}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {formatDay(s.startDate)} a {formatDay(s.endDate)}
          {s.goal && ` · ${s.goal}`}
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        {figures.map((figure) => (
          <Paper key={figure.label} withBorder radius="md" p="md">
            <Text size="xs" c="dimmed">
              {figure.label}
            </Text>
            <Text size="xl" fw={700}>
              {figure.value}
            </Text>
            <Text size="xs" c="dimmed">
              {figure.detail}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      <Paper withBorder radius="md" p="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={4}>Burndown</Title>
            <SegmentedControl
              size="xs"
              aria-label="Unidade"
              value={unit}
              onChange={(value) => setUnit(value as BurndownUnit)}
              data={[
                { value: 'points', label: 'Pontos' },
                { value: 'hours', label: 'Horas' },
              ]}
            />
          </Group>
          {burndown.data ? (
            <BurndownChart days={burndown.data.days} scope={burndown.data.scope} unit={unit} />
          ) : (
            <Text size="sm" c="dimmed">
              Carregando…
            </Text>
          )}
        </Stack>
      </Paper>

      <Stack gap="xs">
        <Title order={4}>Cards da sprint</Title>
        <Paper withBorder radius="md">
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Card</Table.Th>
                <Table.Th>Resultado</Table.Th>
                <Table.Th ta="right">Pontos (início → fim)</Table.Th>
                <Table.Th ta="right">Tempo</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {s.history.map((entry) => (
                <Table.Tr key={entry.card.id}>
                  <Table.Td maw={288}>
                    <Link
                      to={`/p/${project.key}/c/${entry.card.number}`}
                      className="card-drawer__link"
                      style={entry.card.deleted ? { textDecoration: 'line-through' } : undefined}
                    >
                      <Text span size="xs" c="dimmed" ff="monospace">
                        {project.key}-{entry.card.number}
                      </Text>{' '}
                      {entry.card.title}
                    </Link>
                    {entry.addedLate && (
                      <Badge variant="outline" color="gray" size="sm" ml="xs">
                        entrou depois
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {entry.outcome ? outcomeLabels[entry.outcome] : 'Em andamento'}
                    </Text>
                    {entry.columnAtClose && (
                      <Text size="xs" c="dimmed">
                        {entry.columnAtClose}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">
                    {entry.pointsAtStart ?? '—'} → {entry.pointsAtEnd ?? '—'}
                  </Table.Td>
                  <Table.Td ta="right">
                    {entry.timeSpentMinutes !== null
                      ? `${Math.round((entry.timeSpentMinutes / 60) * 10) / 10} h`
                      : '—'}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </Stack>
  )
}
