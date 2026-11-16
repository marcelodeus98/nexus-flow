import { Anchor, Badge, ColorSwatch, Group, Text } from '@mantine/core'
import { IconStar } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { actionLabel, describeMetadata } from '@/features/audit/audit-labels'
import { roleLabels } from '@/features/projects/api'
import { formatHours } from '@/features/reports/api'
import { STATUS_COLOR, STATUS_LABEL } from '@/features/team-map/office-layout'
import {
  ViewCardLink,
  ViewDrawer,
  ViewEmpty,
  ViewFields,
  ViewFigures,
  ViewSection,
  formatDate,
  formatDateTime,
} from '@/shared/ui/view-drawer'
import { useDepartmentOverview, useTeamOverview, useUserOverview, type Work } from './details-api'

// The admin lists' "Visualizar" panels: a user, a department, a team.

function since(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000))
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h} h`
}

function StatusBadge({ status }: { status: Work['status'] }) {
  return (
    <Badge
      variant="light"
      color={STATUS_COLOR[status]}
      leftSection={
        <span className="view-drawer__dot" style={{ background: STATUS_COLOR[status] }} />
      }
    >
      {STATUS_LABEL[status]}
    </Badge>
  )
}

// What someone is doing: status, open and late cards, and the timer.
function workNote(work: Work) {
  return [
    work.timer ? `foco há ${since(work.timer.startedAt)}` : STATUS_LABEL[work.status].toLowerCase(),
    `${work.openCards} ${work.openCards === 1 ? 'aberto' : 'abertos'}`,
    work.overdue > 0 && `${work.overdue} ${work.overdue === 1 ? 'atrasado' : 'atrasados'}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

function PersonRow({
  person,
  extra,
}: {
  person: Work & { name: string; jobTitle: string | null; isActive: boolean }
  extra?: React.ReactNode
}) {
  return (
    <div className="view-drawer__row">
      <span className="view-drawer__dot" style={{ background: STATUS_COLOR[person.status] }} />
      <div style={{ minWidth: 0 }}>
        <Text size="sm" fw={500}>
          {person.name}
          {!person.isActive && (
            <Badge ml={6} size="xs" color="gray" variant="light">
              Desativado
            </Badge>
          )}
        </Text>
        {(person.jobTitle || extra) && (
          <Text size="xs" c="dimmed">
            {[person.jobTitle, extra].filter(Boolean).join(' · ')}
          </Text>
        )}
      </div>
      <span className="view-drawer__muted">{workNote(person)}</span>
    </div>
  )
}

export function UserView({
  userId,
  onClose,
  onEdit,
}: {
  userId: string
  onClose: () => void
  onEdit: () => void
}) {
  const user = useUserOverview(userId)
  const u = user.data
  return (
    <ViewDrawer
      onClose={onClose}
      title={u?.name ?? 'Usuário'}
      subtitle={u ? [u.email, u.jobTitle].filter(Boolean).join(' · ') : undefined}
      badges={
        u && (
          <>
            {u.globalRole === 'ADMIN' ? (
              <Badge>Administrador</Badge>
            ) : (
              <Badge color="gray" variant="light">
                Usuário
              </Badge>
            )}
            {u.isActive ? (
              <Badge color="teal" variant="light">
                Ativo
              </Badge>
            ) : (
              <Badge color="gray">Desativado</Badge>
            )}
            <StatusBadge status={u.work.status} />
          </>
        )
      }
      onEdit={onEdit}
      loading={user.isPending}
      error={user.error}
    >
      {u && (
        <>
          <ViewSection title="Dados">
            <ViewFields
              fields={[
                [
                  'Departamento',
                  u.department ? (
                    <Group key="department" gap={6} wrap="nowrap">
                      <ColorSwatch color={u.department.color} size={10} />
                      {u.department.name}
                    </Group>
                  ) : null,
                ],
                ['Cargo', u.jobTitle],
                ['Acesso', u.hasPassword ? 'E-mail e senha' : 'Sem senha definida'],
                ['Cadastro', formatDate(u.createdAt)],
                [
                  'Última atividade',
                  u.lastActivityAt ? formatDateTime(u.lastActivityAt) : 'Nenhuma',
                ],
              ]}
            />
          </ViewSection>

          <ViewSection title="Trabalho agora">
            <ViewFigures
              figures={[
                { label: 'horas hoje', value: formatHours(u.todaySeconds) },
                { label: 'horas na semana', value: formatHours(u.weekSeconds) },
                { label: 'cards abertos', value: u.work.openCards },
                { label: 'atrasados', value: u.work.overdue, alert: u.work.overdue > 0 },
              ]}
            />
            {u.work.timer && (
              <Text size="xs" fw={700} c={STATUS_COLOR.FOCUS} mt="sm" mb={4}>
                Timer rodando há {since(u.work.timer.startedAt)}
              </Text>
            )}
            {u.work.timer && <ViewCardLink card={u.work.timer.card} />}
            <Text size="xs" fw={600} c="dimmed" mt="sm" mb={4}>
              Em andamento
            </Text>
            {u.work.inProgress.length === 0 ? (
              <ViewEmpty>Nenhum card em andamento.</ViewEmpty>
            ) : (
              u.work.inProgress.map((card) => <ViewCardLink key={card.id} card={card} />)
            )}
          </ViewSection>

          <ViewSection title="Times">
            {u.teams.length === 0 && u.ledTeams.length === 0 ? (
              <ViewEmpty>Não participa de nenhum time.</ViewEmpty>
            ) : (
              <Group gap={6}>
                {u.teams.map((team) => (
                  <Badge
                    key={team.id}
                    variant="light"
                    leftSection={team.isLeader ? <IconStar size={10} /> : undefined}
                  >
                    {team.name}
                  </Badge>
                ))}
                {u.ledTeams
                  .filter((led) => !u.teams.some((t) => t.id === led.id))
                  .map((team) => (
                    <Badge key={team.id} variant="outline" leftSection={<IconStar size={10} />}>
                      {team.name} (líder, sem ser membro)
                    </Badge>
                  ))}
              </Group>
            )}
          </ViewSection>

          <ViewSection title={`Projetos (${u.projects.length})`}>
            {u.projects.length === 0 ? (
              <ViewEmpty>Não participa de nenhum projeto.</ViewEmpty>
            ) : (
              u.projects.map((project) => (
                <div key={project.id} className="view-drawer__row">
                  <Badge variant="light" radius="sm" ff="monospace">
                    {project.key}
                  </Badge>
                  <Anchor component={Link} to={`/p/${project.key}`} size="sm">
                    {project.name}
                  </Anchor>
                  {project.status === 'ARCHIVED' && (
                    <Badge size="xs" color="gray" variant="light">
                      Arquivado
                    </Badge>
                  )}
                  <span className="view-drawer__muted">
                    {roleLabels[project.role]}
                    {!project.direct && ` · via ${project.teams.join(', ')}`}
                  </span>
                </div>
              ))
            )}
          </ViewSection>

          <ViewSection title="O que fez por último">
            {u.activity.length === 0 ? (
              <ViewEmpty>Nenhuma ação registrada.</ViewEmpty>
            ) : (
              u.activity.map((entry) => (
                <div key={entry.id} className="view-drawer__row">
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm">{actionLabel(entry.action)}</Text>
                    {describeMetadata(entry.metadata) && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {describeMetadata(entry.metadata)}
                      </Text>
                    )}
                  </div>
                  <span className="view-drawer__muted">{formatDateTime(entry.createdAt)}</span>
                </div>
              ))
            )}
          </ViewSection>

          <ViewSection title="Histórico da conta">
            {u.history.length === 0 ? (
              <ViewEmpty>Nenhuma alteração registrada.</ViewEmpty>
            ) : (
              u.history.map((entry) => (
                <div key={entry.id} className="view-drawer__row">
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm">{actionLabel(entry.action)}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {[entry.actor && `por ${entry.actor}`, describeMetadata(entry.metadata)]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </div>
                  <span className="view-drawer__muted">{formatDateTime(entry.createdAt)}</span>
                </div>
              ))
            )}
          </ViewSection>
        </>
      )}
    </ViewDrawer>
  )
}

export function DepartmentView({
  departmentId,
  onClose,
  onEdit,
}: {
  departmentId: string
  onClose: () => void
  onEdit: () => void
}) {
  const department = useDepartmentOverview(departmentId)
  const d = department.data
  return (
    <ViewDrawer
      onClose={onClose}
      title={
        d ? (
          <Group gap="xs">
            <ColorSwatch color={d.color} size={14} />
            {d.name}
          </Group>
        ) : (
          'Departamento'
        )
      }
      subtitle={
        d
          ? `${d.totals.people} ${d.totals.people === 1 ? 'pessoa ativa' : 'pessoas ativas'}`
          : undefined
      }
      badges={
        d?.isSystem && (
          <Badge color="gray" variant="light">
            Padrão
          </Badge>
        )
      }
      onEdit={onEdit}
      loading={department.isPending}
      error={department.error}
    >
      {d && (
        <>
          <ViewFigures
            figures={[
              { label: STATUS_LABEL.FOCUS.toLowerCase(), value: d.totals.focus },
              { label: STATUS_LABEL.ACTIVE.toLowerCase(), value: d.totals.active },
              { label: STATUS_LABEL.IDLE.toLowerCase(), value: d.totals.idle },
              { label: 'cards atrasados', value: d.totals.overdue, alert: d.totals.overdue > 0 },
            ]}
          />
          <ViewSection
            title="Pessoas"
            aside={
              <Anchor component={Link} to="/team-map" size="xs">
                Ver no Mapa da equipe
              </Anchor>
            }
          >
            {d.people.length === 0 ? (
              <ViewEmpty>Ninguém neste departamento.</ViewEmpty>
            ) : (
              d.people.map((person) => <PersonRow key={person.id} person={person} />)
            )}
          </ViewSection>
        </>
      )}
    </ViewDrawer>
  )
}

export function TeamView({
  teamId,
  onClose,
  onEdit,
}: {
  teamId: string
  onClose: () => void
  onEdit: () => void
}) {
  const team = useTeamOverview(teamId)
  const t = team.data
  return (
    <ViewDrawer
      onClose={onClose}
      title={t?.name ?? 'Time'}
      subtitle={t?.description ?? undefined}
      badges={
        t && (
          <Badge variant="light" leftSection={<IconStar size={10} />}>
            {t.leader ? `Líder: ${t.leader.name}` : 'Sem líder'}
          </Badge>
        )
      }
      onEdit={onEdit}
      editLabel="Gerenciar"
      loading={team.isPending}
      error={team.error}
    >
      {t && (
        <>
          <ViewSection
            title={`Membros (${t.members.length})`}
            aside={
              <Anchor component={Link} to={`/team-reports?team=${t.id}`} size="xs">
                Relatórios de equipe
              </Anchor>
            }
          >
            {t.members.length === 0 ? (
              <ViewEmpty>O time ainda não tem membros.</ViewEmpty>
            ) : (
              t.members.map((member) => (
                <PersonRow key={member.id} person={member} extra={member.department?.name} />
              ))
            )}
            {t.leader && !t.members.some((m) => m.id === t.leader!.id) && (
              <Text size="xs" c="dimmed" mt={6}>
                {t.leader.name} lidera o time sem ser membro.
              </Text>
            )}
          </ViewSection>
          <ViewSection title={`Projetos vinculados (${t.projects.length})`}>
            {t.projects.length === 0 ? (
              <ViewEmpty>
                Nenhum projeto. Vincule o time em Configurações → Membros do projeto.
              </ViewEmpty>
            ) : (
              t.projects.map((project) => (
                <div key={project.id} className="view-drawer__row">
                  <Badge variant="light" radius="sm" ff="monospace">
                    {project.key}
                  </Badge>
                  <Anchor component={Link} to={`/p/${project.key}`} size="sm">
                    {project.name}
                  </Anchor>
                  <span className="view-drawer__muted">
                    todos entram como {roleLabels[project.role]}
                  </span>
                </div>
              ))
            )}
          </ViewSection>
          <Text size="xs" c="dimmed">
            Criado em {formatDate(t.createdAt)}
          </Text>
        </>
      )}
    </ViewDrawer>
  )
}
