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
  TextInput,
  Title,
} from '@mantine/core'
import { Link } from 'react-router-dom'
import { methodologyLabels } from '@/features/projects/api'
import { formatHours } from '@/features/reports/api'
import { HoursBars } from '@/features/reports/hours-bars'
import { Stat } from '@/features/reports/quality-section'
import { apiErrorMessage } from '@/shared/api/errors'
import { useOverview, type Overview } from './api'
import { dayLabel, dayRows, pct, useReportParams } from './report-params'
import './team-reports.css'

type View = 'projects' | 'teams' | 'people' | 'days'
const views: { value: View; label: string }[] = [
  { value: 'projects', label: 'Projetos' },
  { value: 'teams', label: 'Times' },
  { value: 'people', label: 'Pessoas' },
  { value: 'days', label: 'Horas por dia' },
]

// The admin's macro view: every active project, team and person side by side.
export function OverviewPage() {
  const { from, to, get, set } = useReportParams()
  const view = (get('view') as View | undefined) ?? 'projects'
  const overview = useOverview({ from, to })
  const data = overview.data

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Visão geral</Title>
        <Text size="sm" c="dimmed">
          Todos os projetos ativos, times e pessoas no período. Abertos e atrasados são de hoje.
        </Text>
      </div>

      <Paper withBorder radius="md" p="sm">
        <Group align="flex-end" gap="sm">
          <TextInput
            label="De"
            type="date"
            size="xs"
            value={from}
            max={to}
            onChange={(e) => set('from', e.target.value)}
          />
          <TextInput
            label="Até"
            type="date"
            size="xs"
            value={to}
            min={from}
            onChange={(e) => set('to', e.target.value)}
          />
        </Group>
      </Paper>

      {overview.isError && (
        <Text size="sm" c="red">
          {apiErrorMessage(overview.error)}
        </Text>
      )}
      {overview.isPending && (
        <Text size="sm" c="dimmed">
          Carregando…
        </Text>
      )}

      {data && (
        <>
          <Totals overview={data} />
          <SegmentedControl
            size="xs"
            aria-label="Detalhe"
            value={view}
            onChange={(value) => set('view', value === 'projects' ? undefined : value)}
            data={views}
            className="team-report__views"
          />
          <Paper withBorder radius="md" p="md">
            {view === 'projects' && <ProjectsTable overview={data} />}
            {view === 'teams' && <TeamsTable overview={data} from={from} to={to} />}
            {view === 'people' && <PeopleTable overview={data} />}
            {view === 'days' && (
              <Stack gap="sm">
                <Title order={4}>Horas por dia</Title>
                <HoursBars report={{ rows: dayRows(data.days) }} />
              </Stack>
            )}
          </Paper>
        </>
      )}
    </Stack>
  )
}

function Totals({ overview }: { overview: Overview }) {
  const t = overview.totals
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
      <Stat
        label="Horas registradas"
        value={formatHours(t.seconds)}
        detail={`${t.people} pessoas ativas · ${t.teams} times`}
      />
      <Stat
        label="Cards concluídos"
        value={String(t.cardsDone)}
        detail={`em ${t.projects} projetos ativos`}
      />
      <Stat
        label="Em aberto agora"
        value={String(t.openCards)}
        detail={`${t.overdue} atrasados · ${t.openBugs} bugs abertos`}
      />
      <Stat
        label="Taxa de reprovação"
        value={pct(t.rejectionRate)}
        detail={`${t.reviews} revisões do QA no período`}
      />
    </SimpleGrid>
  )
}

const Late = ({ value }: { value: number }) => (
  <Table.Td c={value > 0 ? 'red' : undefined}>{value}</Table.Td>
)

function ProjectsTable({ overview }: { overview: Overview }) {
  if (overview.projects.length === 0) return <Text size="sm">Nenhum projeto ativo.</Text>
  return (
    <Table.ScrollContainer minWidth={980}>
      <Table striped highlightOnHover className="team-report__table">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Projeto</Table.Th>
            <Table.Th>Sprint ativa</Table.Th>
            <Table.Th>Membros</Table.Th>
            <Table.Th>Horas</Table.Th>
            <Table.Th>Concluídos</Table.Th>
            <Table.Th>Abertos</Table.Th>
            <Table.Th>Em andamento</Table.Th>
            <Table.Th>Atrasados</Table.Th>
            <Table.Th>Bugs abertos</Table.Th>
            <Table.Th>Bugs corrigidos</Table.Th>
            <Table.Th>Reprovação</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {overview.projects.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td>
                <Group gap={6} wrap="nowrap">
                  <Badge variant="light" radius="sm" ff="monospace">
                    {p.key}
                  </Badge>
                  <Anchor component={Link} to={`/p/${p.key}/reports`} size="sm">
                    {p.name}
                  </Anchor>
                  <Text size="xs" c="dimmed">
                    {methodologyLabels[p.methodology]}
                  </Text>
                </Group>
              </Table.Td>
              <Table.Td>
                {p.activeSprint
                  ? `${p.activeSprint.name} (até ${dayLabel(p.activeSprint.endDate)})`
                  : '—'}
              </Table.Td>
              <Table.Td>{p.members}</Table.Td>
              <Table.Td>{formatHours(p.seconds)}</Table.Td>
              <Table.Td>{p.cardsDone}</Table.Td>
              <Table.Td>{p.openCards}</Table.Td>
              <Table.Td>{p.inProgress}</Table.Td>
              <Late value={p.overdue} />
              <Table.Td>{p.openBugs}</Table.Td>
              <Table.Td>{p.bugsFixed}</Table.Td>
              <Table.Td>{pct(p.rejectionRate)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}

function TeamsTable({ overview, from, to }: { overview: Overview; from: string; to: string }) {
  if (overview.teams.length === 0) return <Text size="sm">Nenhum time criado.</Text>
  return (
    <Table.ScrollContainer minWidth={720}>
      <Table striped highlightOnHover className="team-report__table">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Time</Table.Th>
            <Table.Th>Líder</Table.Th>
            <Table.Th>Membros</Table.Th>
            <Table.Th>Horas</Table.Th>
            <Table.Th>Concluídos</Table.Th>
            <Table.Th>Abertos</Table.Th>
            <Table.Th>Atrasados</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {overview.teams.map((t) => (
            <Table.Tr key={t.id}>
              <Table.Td>
                <Anchor
                  component={Link}
                  to={`/team-reports?team=${t.id}&from=${from}&to=${to}`}
                  size="sm"
                >
                  {t.name}
                </Anchor>
              </Table.Td>
              <Table.Td>{t.leader?.name ?? '—'}</Table.Td>
              <Table.Td>{t.members}</Table.Td>
              <Table.Td>{formatHours(t.seconds)}</Table.Td>
              <Table.Td>{t.cardsDone}</Table.Td>
              <Table.Td>{t.openCards}</Table.Td>
              <Late value={t.overdue} />
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}

function PeopleTable({ overview }: { overview: Overview }) {
  return (
    <Table.ScrollContainer minWidth={720}>
      <Table striped highlightOnHover className="team-report__table">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Pessoa</Table.Th>
            <Table.Th>Cargo</Table.Th>
            <Table.Th>Departamento</Table.Th>
            <Table.Th>Horas</Table.Th>
            <Table.Th>Concluídos</Table.Th>
            <Table.Th>Abertos</Table.Th>
            <Table.Th>Atrasados</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {overview.people.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td>{p.name}</Table.Td>
              <Table.Td>{p.jobTitle ?? '—'}</Table.Td>
              <Table.Td>{p.department ?? '—'}</Table.Td>
              <Table.Td>{formatHours(p.seconds)}</Table.Td>
              <Table.Td>{p.cardsDone}</Table.Td>
              <Table.Td>{p.openCards}</Table.Td>
              <Late value={p.overdue} />
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
