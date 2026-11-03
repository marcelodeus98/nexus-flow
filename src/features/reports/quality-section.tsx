import { BarChart } from '@mantine/charts'
import { Badge, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core'
import { severityColors, severityLabels, type BugSeverity } from '@/features/qa/bug-severity'
import { apiErrorMessage } from '@/shared/api/errors'
import { useQualityReport, type QualityReport, type RangeFilter } from './api'

// Validated with the dataviz palette checks (light surface): the brand teal's
// step 6 (step 7 reads gray as a series color), orange and violet.
// The chart's legend lists series by key, so the bars use the same order.
const SERIES = [
  { name: 'approved', label: 'Aprovações', color: '#01a397' },
  { name: 'bugs', label: 'Bugs reportados', color: '#5f3dc4' },
  { name: 'rejected', label: 'Reprovações', color: '#e8590c' },
]

const SEVERITIES: BugSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const sprintStatus = { PLANNED: 'Planejada', ACTIVE: 'Em andamento', CLOSED: 'Encerrada' }

const pct = (value: number | null) => (value === null ? '—' : `${value.toLocaleString('pt-BR')}%`)
const num = (value: number | null, suffix = '') =>
  value === null ? '—' : `${value.toLocaleString('pt-BR')}${suffix}`
const weekLabel = (week: string) => `${week.slice(8, 10)}/${week.slice(5, 7)}`

// QA phase D: the project's quality in the period (or sprint). Aggregates
// only: no one's individual numbers.
export function QualitySection({ projectId, filter }: { projectId: string; filter: RangeFilter }) {
  const report = useQualityReport(projectId, filter, true)
  if (report.isPending)
    return (
      <Text size="sm" c="dimmed">
        Carregando…
      </Text>
    )
  if (report.isError)
    return (
      <Text size="sm" c="red">
        {apiErrorMessage(report.error)}
      </Text>
    )
  const q = report.data

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 6 }}>
        <Stat
          label="Taxa de reprovação"
          value={pct(q.reviews.rejectionRate)}
          detail={`${q.reviews.rejected} de ${q.reviews.total} revisões`}
        />
        <Stat
          label="Aprovação de primeira"
          value={pct(q.firstPassYield)}
          detail="cards aprovados sem nenhuma reprovação"
        />
        <Stat
          label="Retrabalho médio"
          value={num(q.avgRework)}
          detail="reprovações por card aprovado"
        />
        <Stat
          label="Tempo em teste"
          value={num(q.timeInTesting.medianHours, ' h')}
          detail={`mediana · média ${num(q.timeInTesting.avgHours, ' h')} · ${q.timeInTesting.passages} passagens`}
        />
        <Stat
          label="Bugs abertos"
          value={String(q.bugs.open)}
          detail={`${q.bugs.created} reportados e ${q.bugs.fixed} corrigidos no período`}
        />
        <Stat
          label="Tempo para corrigir bug"
          value={num(q.bugs.avgHoursToFix, ' h')}
          detail="média, da criação até Concluído"
        />
      </SimpleGrid>

      <Paper withBorder radius="md" p="md">
        <Stack gap="sm">
          <div>
            <Title order={4}>Por semana</Title>
            <Text size="sm" c="dimmed">
              Revisões do QA e bugs reportados, semana a semana (início na segunda-feira).
            </Text>
          </div>
          {q.weeks.length > 0 ? (
            <WeeklyChart weeks={q.weeks} />
          ) : (
            <Text size="sm" c="dimmed">
              Nada no período.
            </Text>
          )}
        </Stack>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Title order={4}>Bugs por severidade</Title>
            <Table verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Severidade</Table.Th>
                  <Table.Th ta="right">Reportados no período</Table.Th>
                  <Table.Th ta="right">Abertos agora</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {SEVERITIES.map((severity) => (
                  <Table.Tr key={severity}>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={severityColors[severity]}>
                        {severityLabels[severity]}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">{q.bugs.createdBySeverity[severity]}</Table.Td>
                    <Table.Td ta="right">{q.bugs.openBySeverity[severity]}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Paper>
        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Title order={4}>Casos de teste executados</Title>
            <Group gap="xl">
              <Figure label="Passaram" value={q.tests.passed} />
              <Figure label="Falharam" value={q.tests.failed} />
              <Figure label="Bloqueados" value={q.tests.blocked} />
            </Group>
          </Stack>
        </Paper>
      </SimpleGrid>

      {q.sprints.length > 0 && (
        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Title order={4}>Sprints</Title>
            <Table verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Sprint</Table.Th>
                  <Table.Th ta="right">Aprovações</Table.Th>
                  <Table.Th ta="right">Reprovações</Table.Th>
                  <Table.Th ta="right">Bugs encontrados</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {q.sprints.map((sprint) => (
                  <Table.Tr key={sprint.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {sprint.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {sprintStatus[sprint.status]} · {weekLabel(sprint.startDate)} a{' '}
                        {weekLabel(sprint.endDate)}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">{sprint.approved}</Table.Td>
                    <Table.Td ta="right">{sprint.rejected}</Table.Td>
                    <Table.Td ta="right">{sprint.bugs}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}

// Grouped bars on one count axis; Mantine's tooltip shows every series of
// the hovered week, the legend names them, and the table below repeats the
// numbers for screen readers and print.
function WeeklyChart({ weeks }: { weeks: QualityReport['weeks'] }) {
  const data = weeks.map((week) => ({ ...week, label: weekLabel(week.week) }))
  return (
    <Stack gap="xs">
      <BarChart
        h={260}
        data={data}
        dataKey="label"
        series={SERIES}
        withLegend
        legendProps={{ verticalAlign: 'top', height: 36 }}
        gridAxis="x"
        strokeDasharray="0"
        gridColor="var(--nexa-border)"
        tickLine="none"
        barProps={{ radius: [4, 4, 0, 0] }}
        barChartProps={{ barGap: 2 }}
        valueFormatter={(value) => value.toLocaleString('pt-BR')}
        yAxisProps={{ allowDecimals: false, width: 32 }}
      />
      <details className="quality__table">
        <summary>Ver como tabela</summary>
        <Table verticalSpacing={4} mt="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Semana de</Table.Th>
              {SERIES.map((series) => (
                <Table.Th key={series.name} ta="right">
                  {series.label}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {weeks.map((week) => (
              <Table.Tr key={week.week}>
                <Table.Td>{weekLabel(week.week)}</Table.Td>
                {SERIES.map((series) => (
                  <Table.Td key={series.name} ta="right">
                    {week[series.name as 'approved' | 'bugs' | 'rejected']}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </details>
    </Stack>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={700}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {detail}
      </Text>
    </Paper>
  )
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <Text size="xl" fw={700}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </div>
  )
}
