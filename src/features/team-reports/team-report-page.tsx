import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { IconDownload, IconInfoCircle } from '@tabler/icons-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HelpLink } from '@/features/help/help-link'
import { severityLabels, type BugSeverity } from '@/features/qa/bug-severity'
import { formatHours } from '@/features/reports/api'
import { HoursBars } from '@/features/reports/hours-bars'
import { Stat } from '@/features/reports/quality-section'
import { apiErrorMessage } from '@/shared/api/errors'
import { toast } from '@/shared/notify/toast'
import {
  useExportTeamReport,
  useReportTeams,
  useTeamReport,
  type TeamMemberRow,
  type TeamReport,
} from './api'
import { dayRows, minutesAsHours, num, pct, signedPct, useReportParams } from './report-params'
import './team-reports.css'

const ALL = 'all'
const SEVERITIES: BugSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

type View = 'people' | 'quality' | 'qa' | 'projects' | 'days'
const views: { value: View; label: string }[] = [
  { value: 'people', label: 'Entregas por pessoa' },
  { value: 'quality', label: 'Qualidade por pessoa' },
  { value: 'qa', label: 'Validação e testes' },
  { value: 'projects', label: 'Projetos' },
  { value: 'days', label: 'Horas por dia' },
]

// A team's numbers for its leader (and admins): every member's work across
// all projects, per person and for the team.
export function TeamReportPage() {
  const teams = useReportTeams()
  const { from, to, get, set } = useReportParams()
  const teamId = get('team') ?? teams.data?.[0]?.id
  const projectId = get('project')
  const view = (get('view') as View | undefined) ?? 'people'
  const report = useTeamReport(teamId, { from, to, projectId })
  const requestExport = useExportTeamReport(teamId)
  const [exported, setExported] = useState(false)

  function exportFile(format: 'CSV' | 'XLSX') {
    requestExport.mutate(
      { from, to, projectId, format },
      {
        onSuccess: () => {
          setExported(true)
          toast.success('Exportação pedida. Avisamos quando ficar pronta.')
        },
        onError: (error) =>
          toast.error(
            apiErrorMessage(error, { 503: 'O armazenamento de arquivos não está configurado.' }),
          ),
      },
    )
  }

  if (teams.isSuccess && teams.data.length === 0) {
    return (
      <Stack gap="md">
        <Title order={2}>Relatórios de equipe</Title>
        <Text size="sm" c="dimmed">
          Você não lidera nenhum time. Um administrador define o líder em Administração → Times.
        </Text>
      </Stack>
    )
  }

  const data = report.data
  return (
    <Stack gap="lg">
      <div>
        <Group justify="space-between">
          <Title order={2}>Relatórios de equipe</Title>
          <HelpLink topic="reports" />
        </Group>
        <Text size="sm" c="dimmed">
          O trabalho dos membros do time em todos os projetos: horas, entregas, qualidade e
          validação.
        </Text>
      </div>

      <Paper withBorder radius="md" p="sm">
        <Group align="flex-end" gap="sm">
          <Select
            label="Time"
            size="xs"
            w={200}
            value={teamId ?? null}
            onChange={(value) => {
              set('project', undefined)
              set('team', value ?? undefined)
            }}
            allowDeselect={false}
            data={(teams.data ?? []).map((team) => ({ value: team.id, label: team.name }))}
          />
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
          <Select
            label="Projeto"
            size="xs"
            w={200}
            value={projectId ?? ALL}
            onChange={(v) => set('project', !v || v === ALL ? undefined : v)}
            allowDeselect={false}
            data={[
              { value: ALL, label: 'Todos' },
              ...(data?.projects ?? []).map((p) => ({
                value: p.id,
                label: `${p.key} · ${p.name}`,
              })),
            ]}
          />
          <Group gap="xs" ml="auto">
            {(['XLSX', 'CSV'] as const).map((format) => (
              <Button
                key={format}
                variant="default"
                size="xs"
                leftSection={<IconDownload size={14} />}
                disabled={!teamId || requestExport.isPending}
                onClick={() => exportFile(format)}
              >
                {format === 'XLSX' ? 'Excel' : 'CSV'}
              </Button>
            ))}
          </Group>
        </Group>
      </Paper>
      {exported && (
        <Text size="sm" c="dimmed">
          A exportação aparece em{' '}
          <Link to="/exports" className="text-link">
            Minhas exportações
          </Link>{' '}
          quando estiver pronta.
        </Text>
      )}

      {report.isError && (
        <Text size="sm" c="red">
          {apiErrorMessage(report.error)}
        </Text>
      )}
      {(report.isPending || teams.isPending) && !report.isError && (
        <Text size="sm" c="dimmed">
          Carregando…
        </Text>
      )}

      {data && (
        <>
          {data.team.leader && !data.leaderIsMember && (
            <Alert variant="light" color="gray" icon={<IconInfoCircle size={16} />}>
              {data.team.leader.name} lidera o time sem ser membro, então o trabalho dele não entra
              nestes números.
            </Alert>
          )}
          <Summary report={data} />

          <SegmentedControl
            size="xs"
            aria-label="Detalhe"
            value={view}
            onChange={(value) => set('view', value === 'people' ? undefined : value)}
            data={views}
            className="team-report__views"
          />
          <Paper withBorder radius="md" p="md">
            {view === 'people' && <DeliveryTable members={data.members} />}
            {view === 'quality' && <QualityTable members={data.members} />}
            {view === 'qa' && <ValidationTable report={data} />}
            {view === 'projects' && <ProjectsTable report={data} />}
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

function Summary({ report }: { report: TeamReport }) {
  const t = report.totals
  const q = report.quality
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
      <Stat
        label="Horas registradas"
        value={formatHours(t.seconds)}
        detail={`${t.entries} lançamentos · ${t.members} pessoas`}
      />
      <Stat
        label="Cards concluídos"
        value={String(t.cardsDone)}
        detail={`${num(t.pointsDone)} pontos no período`}
      />
      <Stat
        label="Estimado vs real"
        value={signedPct(t.deviationPct)}
        detail={`${minutesAsHours(t.estimateMinutesDone)} estimadas · ${minutesAsHours(t.actualMinutesDone)} gastas`}
      />
      <Stat
        label="Em aberto agora"
        value={String(t.openCards)}
        detail={`${t.inProgress} em andamento · ${t.overdue} atrasados · ${t.openBugs} bugs`}
      />
      <Stat
        label="Taxa de reprovação"
        value={pct(q.rejectionRate)}
        detail={`${q.rejected} de ${q.reviews} revisões do QA`}
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
        label="Bugs nos cards do time"
        value={String(q.bugsFoundInTeamCards)}
        detail={`${q.bugsReported} reportados pelo time`}
      />
    </SimpleGrid>
  )
}

function Person({ member }: { member: TeamMemberRow }) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text size="sm" fw={500}>
        {member.name}
      </Text>
      {member.isLeader && (
        <Badge size="xs" variant="light">
          Líder
        </Badge>
      )}
      {!member.isActive && (
        <Badge size="xs" variant="light" color="gray">
          Inativo
        </Badge>
      )}
    </Group>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <Text size="sm" c="dimmed" py="md">
      {text}
    </Text>
  )
}

function DeliveryTable({ members }: { members: TeamMemberRow[] }) {
  if (members.length === 0) return <Empty text="O time não tem membros." />
  return (
    <Stack gap="sm">
      <Title order={4}>Entregas por pessoa</Title>
      <Table.ScrollContainer minWidth={820}>
        <Table striped highlightOnHover className="team-report__table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Pessoa</Table.Th>
              <Table.Th>Horas</Table.Th>
              <Table.Th>Concluídos</Table.Th>
              <Table.Th>Pontos</Table.Th>
              <Table.Th>Estimado</Table.Th>
              <Table.Th>Real</Table.Th>
              <Table.Th>Desvio</Table.Th>
              <Table.Th>Abertos</Table.Th>
              <Table.Th>Em andamento</Table.Th>
              <Table.Th>Atrasados</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {members.map((m) => (
              <Table.Tr key={m.id}>
                <Table.Td>
                  <Person member={m} />
                </Table.Td>
                <Table.Td>{formatHours(m.seconds)}</Table.Td>
                <Table.Td>{m.cardsDone}</Table.Td>
                <Table.Td>{num(m.pointsDone)}</Table.Td>
                <Table.Td>{minutesAsHours(m.estimateMinutesDone)}</Table.Td>
                <Table.Td>{minutesAsHours(m.actualMinutesDone)}</Table.Td>
                <Table.Td>{signedPct(m.deviationPct)}</Table.Td>
                <Table.Td>{m.openCards}</Table.Td>
                <Table.Td>{m.inProgress}</Table.Td>
                <Table.Td c={m.overdue > 0 ? 'red' : undefined}>{m.overdue}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Text size="xs" c="dimmed">
        Estimado e real somam os cards concluídos no período que tinham estimativa em horas; o real
        inclui o tempo de todos no card. Abertos e atrasados são de hoje.
      </Text>
    </Stack>
  )
}

function QualityTable({ members }: { members: TeamMemberRow[] }) {
  if (members.length === 0) return <Empty text="O time não tem membros." />
  return (
    <Stack gap="sm">
      <Title order={4}>Qualidade por pessoa</Title>
      <Table.ScrollContainer minWidth={760}>
        <Table striped highlightOnHover className="team-report__table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Pessoa</Table.Th>
              <Table.Th>Aprovações</Table.Th>
              <Table.Th>Reprovações</Table.Th>
              <Table.Th>Taxa de reprovação</Table.Th>
              <Table.Th>Aprovação de primeira</Table.Th>
              <Table.Th>Retrabalho médio</Table.Th>
              <Table.Th>Bugs nos seus cards</Table.Th>
              <Table.Th>Bugs abertos</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {members.map((m) => (
              <Table.Tr key={m.id}>
                <Table.Td>
                  <Person member={m} />
                </Table.Td>
                <Table.Td>{m.approvalsReceived}</Table.Td>
                <Table.Td>{m.rejectionsReceived}</Table.Td>
                <Table.Td>{pct(m.rejectionRate)}</Table.Td>
                <Table.Td>{pct(m.firstPassYield)}</Table.Td>
                <Table.Td>{num(m.avgRework)}</Table.Td>
                <Table.Td>{m.bugsFoundInTheirCards}</Table.Td>
                <Table.Td>{m.openBugs}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Text size="xs" c="dimmed">
        Vereditos do QA nos cards em que a pessoa é responsável, no período.
      </Text>
    </Stack>
  )
}

function ValidationTable({ report }: { report: TeamReport }) {
  const q = report.quality
  return (
    <Stack gap="md">
      <Title order={4}>Validação e testes feitos pelo time</Title>
      <Table.ScrollContainer minWidth={700}>
        <Table striped highlightOnHover className="team-report__table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Pessoa</Table.Th>
              <Table.Th>Aprovou</Table.Th>
              <Table.Th>Reprovou</Table.Th>
              <Table.Th>Testes que passaram</Table.Th>
              <Table.Th>Falharam</Table.Th>
              <Table.Th>Bloqueados</Table.Th>
              <Table.Th>Bugs reportados</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {report.members.map((m) => (
              <Table.Tr key={m.id}>
                <Table.Td>
                  <Person member={m} />
                </Table.Td>
                <Table.Td>{m.approvalsGiven}</Table.Td>
                <Table.Td>{m.rejectionsGiven}</Table.Td>
                <Table.Td>{m.testsPassed}</Table.Td>
                <Table.Td>{m.testsFailed}</Table.Td>
                <Table.Td>{m.testsBlocked}</Table.Td>
                <Table.Td>{m.bugsReported}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Table.ScrollContainer minWidth={420}>
        <Table className="team-report__table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Bugs por severidade</Table.Th>
              <Table.Th>Reportados pelo time</Table.Th>
              <Table.Th>Encontrados nos cards do time</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {SEVERITIES.map((severity) => (
              <Table.Tr key={severity}>
                <Table.Td>{severityLabels[severity]}</Table.Td>
                <Table.Td>{q.bugsReportedBySeverity[severity]}</Table.Td>
                <Table.Td>{q.bugsFoundBySeverity[severity]}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  )
}

function ProjectsTable({ report }: { report: TeamReport }) {
  if (report.projects.length === 0) return <Empty text="O time não participa de nenhum projeto." />
  return (
    <Stack gap="sm">
      <Title order={4}>Por projeto</Title>
      <Table.ScrollContainer minWidth={560}>
        <Table striped highlightOnHover className="team-report__table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Projeto</Table.Th>
              <Table.Th>Horas</Table.Th>
              <Table.Th>Concluídos</Table.Th>
              <Table.Th>Abertos</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {report.projects.map((p) => (
              <Table.Tr key={p.id}>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <Badge variant="light" radius="sm" ff="monospace">
                      {p.key}
                    </Badge>
                    <Text size="sm">{p.name}</Text>
                    {p.status === 'ARCHIVED' && (
                      <Badge size="xs" variant="light" color="gray">
                        Arquivado
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>{formatHours(p.seconds)}</Table.Td>
                <Table.Td>{p.cardsDone}</Table.Td>
                <Table.Td>{p.openCards}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  )
}
