import {
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { IconDownload } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from '@/shared/notify/toast'
import { useCan } from '@/features/projects/api'
import { useCurrentProject } from '@/features/projects/project-context'
import { useSprints } from '@/features/sprints/api'
import { apiErrorMessage } from '@/shared/api/errors'
import {
  formatHours,
  useEstimateVsActual,
  useRequestExport,
  useTimeReport,
  type GroupBy,
} from './api'
import { HoursBars } from './hours-bars'

const groupLabels: Record<GroupBy, string> = {
  user: 'Pessoa',
  card: 'Card',
  sprint: 'Sprint',
  day: 'Dia',
}

const ALL = 'all'

// Filters live in the URL, so a report can be shared as a link.
export function ProjectReportsPage() {
  const project = useCurrentProject()
  const can = useCan(project.key)
  const seesEveryone = can('reports:view')
  const sprints = useSprints(project.id)
  const [params, setParams] = useSearchParams()
  // Default range: this month so far (fixed when the page opens).
  const [today] = useState(() => new Date().toLocaleDateString('en-CA'))
  const from = params.get('from') ?? `${today.slice(0, 8)}01`
  const to = params.get('to') ?? today
  const groupBy = (params.get('groupBy') as GroupBy | null) ?? 'user'
  const sprintId = params.get('sprint') ?? undefined
  const set = (name: string, value: string | undefined) =>
    setParams(
      () => {
        const next = new URLSearchParams(window.location.search)
        if (value) next.set(name, value)
        else next.delete(name)
        return next
      },
      { replace: true },
    )

  const time = useTimeReport(project.id, { from, to, groupBy, sprintId })
  const estimate = useEstimateVsActual(project.id, sprintId, seesEveryone)
  const requestExport = useRequestExport(project.id)
  const [lastExport, setLastExport] = useState<string>()

  function exportFile(kind: 'TIME_ENTRIES' | 'ESTIMATE_VS_ACTUAL', format: 'CSV' | 'XLSX') {
    requestExport.mutate(
      { kind, format, from, to, sprintId },
      {
        onSuccess: (item) => {
          setLastExport(item.id)
          toast.success('Exportação pedida. Avisamos quando ficar pronta.')
        },
        onError: (error) =>
          toast.error(
            apiErrorMessage(error, { 503: 'O armazenamento de arquivos não está configurado.' }),
          ),
      },
    )
  }

  const exportButton = (label: string, onClick: () => void) => (
    <Button
      variant="default"
      size="xs"
      leftSection={<IconDownload size={14} />}
      disabled={requestExport.isPending}
      onClick={onClick}
    >
      {label}
    </Button>
  )

  return (
    <Stack gap="lg">
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
          {project.methodology !== 'KANBAN' && (
            <Select
              label="Sprint"
              size="xs"
              w={180}
              value={sprintId ?? ALL}
              onChange={(v) => set('sprint', !v || v === ALL ? undefined : v)}
              allowDeselect={false}
              data={[
                { value: ALL, label: 'Todas' },
                ...(sprints.data ?? []).map((sprint) => ({ value: sprint.id, label: sprint.name })),
              ]}
            />
          )}
          <Group gap="xs" ml="auto">
            {exportButton('Excel', () => exportFile('TIME_ENTRIES', 'XLSX'))}
            {exportButton('CSV', () => exportFile('TIME_ENTRIES', 'CSV'))}
          </Group>
        </Group>
      </Paper>
      {lastExport && (
        <Text size="sm" c="dimmed">
          A exportação aparece em{' '}
          <Link to="/exports" className="text-link">
            Minhas exportações
          </Link>{' '}
          quando estiver pronta.
        </Text>
      )}

      <Paper withBorder radius="md" p="md">
        <Stack gap="sm">
          <Group justify="space-between" gap="sm">
            <div>
              <Title order={4}>Horas registradas</Title>
              <Text size="sm" c="dimmed">
                {time.data
                  ? `${formatHours(time.data.totalSeconds)} no período${
                      time.data.filter.onlyOwn ? ' (somente as suas)' : ''
                    }`
                  : 'Carregando…'}
              </Text>
            </div>
            <SegmentedControl
              size="xs"
              aria-label="Agrupar por"
              value={groupBy}
              onChange={(value) => set('groupBy', value)}
              data={(Object.keys(groupLabels) as GroupBy[]).map((value) => ({
                value,
                label: groupLabels[value],
              }))}
            />
          </Group>
          {time.isError && (
            <Text size="sm" c="red">
              {apiErrorMessage(time.error)}
            </Text>
          )}
          {time.data && <HoursBars report={time.data} />}
        </Stack>
      </Paper>

      {seesEveryone && (
        <Stack gap="sm">
          <Group justify="space-between" gap="sm">
            <div>
              <Title order={4}>Estimado vs real</Title>
              {estimate.data && (
                <Text size="sm" c="dimmed">
                  {formatHours(estimate.data.totals.estimateMinutes * 60)} estimadas,{' '}
                  {formatHours(estimate.data.totals.actualMinutesOnEstimated * 60)} gastas nesses
                  cards. Os maiores estouros aparecem primeiro.
                </Text>
              )}
            </div>
            {exportButton('Excel', () => exportFile('ESTIMATE_VS_ACTUAL', 'XLSX'))}
          </Group>
          <Paper withBorder radius="md">
            <Table verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Card</Table.Th>
                  <Table.Th>Coluna</Table.Th>
                  <Table.Th ta="right">Estimado</Table.Th>
                  <Table.Th ta="right">Real</Table.Th>
                  <Table.Th ta="right">Desvio</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {estimate.data?.rows.map((row) => (
                  <Table.Tr key={row.cardId}>
                    <Table.Td maw={320}>
                      <Text size="sm" truncate>
                        <Link
                          to={`/p/${project.key}/c/${row.number}`}
                          className="card-drawer__link"
                        >
                          <Text span size="xs" c="dimmed" ff="monospace">
                            {project.key}-{row.number}
                          </Text>{' '}
                          {row.title}
                        </Link>
                      </Text>
                    </Table.Td>
                    <Table.Td c="dimmed">{row.column}</Table.Td>
                    <Table.Td ta="right">
                      {row.estimateMinutes === null ? '—' : formatHours(row.estimateMinutes * 60)}
                    </Table.Td>
                    <Table.Td ta="right">{formatHours(row.actualMinutes * 60)}</Table.Td>
                    <Table.Td
                      ta="right"
                      c={(row.deviationPct ?? 0) > 20 ? 'red' : undefined}
                      fw={(row.deviationPct ?? 0) > 20 ? 600 : undefined}
                    >
                      {row.deviationPct === null
                        ? '—'
                        : `${row.deviationPct > 0 ? '+' : ''}${row.deviationPct}%`}
                    </Table.Td>
                  </Table.Tr>
                ))}
                {estimate.data?.rows.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        Nenhum card com estimativa em horas ou tempo registrado.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Stack>
      )}
    </Stack>
  )
}
