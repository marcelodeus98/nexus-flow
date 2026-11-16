import {
  Avatar,
  Badge,
  Button,
  CopyButton,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import { IconCheck, IconCopy, IconPlayerPlayFilled, IconStar } from '@tabler/icons-react'
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { roleLabels, useProjects } from '@/features/projects/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { useDaily, useProfile, type ActivityCard, type Daily, type DailyCard } from './api'
import { activityNote, attentionNotes, dailyText, dayName, hoursText } from './daily-summary'
import './me-page.css'

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

// The person's own area: who they are, their teams and projects, and a short
// daily — since the last working day, today, and what needs attention.
export function MePage() {
  const profile = useProfile()
  const [params, setParams] = useSearchParams()
  const [today] = useState(() => new Date().toLocaleDateString('en-CA'))
  const date = params.get('date') ?? today
  const daily = useDaily(date)

  return (
    <Stack gap="lg">
      <ProfileHeader />

      <Stack gap="sm">
        <Group justify="space-between" align="flex-end" gap="sm">
          <div>
            <Title order={3}>Minha daily</Title>
            <Text size="sm" c="dimmed">
              Um resumo das suas tarefas para a reunião diária: o que você fez, o que vai fazer e o
              que está travando.
            </Text>
          </div>
          <Group gap="xs" align="flex-end">
            <TextInput
              label="Dia"
              type="date"
              size="xs"
              value={date}
              max={today}
              onChange={(e) =>
                setParams(
                  e.target.value && e.target.value !== today ? { date: e.target.value } : {},
                  { replace: true },
                )
              }
            />
            {daily.data && profile.data && (
              <CopyButton value={dailyText(daily.data, profile.data.name)}>
                {({ copied, copy }) => (
                  <Button
                    size="xs"
                    leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    color={copied ? 'teal' : undefined}
                    onClick={copy}
                  >
                    {copied ? 'Resumo copiado' : 'Copiar resumo'}
                  </Button>
                )}
              </CopyButton>
            )}
          </Group>
        </Group>

        {daily.isError && (
          <Text size="sm" c="red">
            {apiErrorMessage(daily.error)}
          </Text>
        )}
        {daily.isPending && (
          <Text size="sm" c="dimmed">
            Carregando…
          </Text>
        )}
        {daily.data && <DailyBoard daily={daily.data} />}
      </Stack>
    </Stack>
  )
}

function ProfileHeader() {
  const profile = useProfile()
  const projects = useProjects()
  const p = profile.data
  if (!p) return null
  const active = (projects.data ?? []).filter((project) => project.status === 'ACTIVE')
  const leads = [...p.teams.filter((t) => t.isLeader), ...p.ledTeams]

  return (
    <Paper withBorder radius="md" p="lg">
      <Group align="flex-start" gap="lg" wrap="nowrap" className="me__profile">
        <Avatar size={64} radius="xl" color="brand" variant="filled">
          {initialsOf(p.name)}
        </Avatar>
        <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
          <Group gap="xs">
            <Title order={2}>{p.name}</Title>
            {p.globalRole === 'ADMIN' && (
              <Badge variant="light" color="navy">
                Administrador
              </Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed">
            {[p.jobTitle, p.email].filter(Boolean).join(' · ')}
          </Text>
          <Group gap="xs">
            {p.department && (
              <Badge variant="dot" color={p.department.color}>
                {p.department.name}
              </Badge>
            )}
            {p.teams.map((team) => (
              <Badge
                key={team.id}
                variant="light"
                leftSection={team.isLeader ? <IconStar size={10} /> : undefined}
              >
                {team.name}
              </Badge>
            ))}
          </Group>
          {leads.length > 0 && (
            <Text size="xs" c="dimmed">
              Líder de {leads.map((t) => t.name).join(', ')} ·{' '}
              <Link to="/team-reports" className="text-link">
                Relatórios de equipe
              </Link>
            </Text>
          )}
          {active.length > 0 && (
            <Group gap={6} mt={4}>
              <Text size="xs" c="dimmed">
                Projetos:
              </Text>
              {active.map((project) => (
                <Badge
                  key={project.id}
                  component={Link}
                  to={`/p/${project.key}`}
                  variant="outline"
                  radius="sm"
                  style={{ cursor: 'pointer' }}
                >
                  {project.key}
                  {project.myRole && ` · ${roleLabels[project.myRole]}`}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
      </Group>
    </Paper>
  )
}

function DailyBoard({ daily }: { daily: Daily }) {
  const notes = attentionNotes(daily)
  const gap =
    (Date.parse(`${daily.date}T12:00:00Z`) - Date.parse(`${daily.previousDate}T12:00:00Z`)) /
    86_400_000
  // On Mondays (or after a holiday weekend) the window starts on Friday.
  const previousTitle = gap > 1 ? `Desde ${dayName(daily.previousDate)}` : 'Ontem'
  const doneToday = [...daily.today.completed, ...daily.today.worked]
  const inProgressIds = new Set(daily.open.inProgress.map((c) => c.id))
  const dueTodayOnly = daily.attention.dueToday.filter((c) => !inProgressIds.has(c.id))

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <Figure
          label={`Horas · ${previousTitle.toLowerCase()}`}
          value={hoursText(daily.previous.seconds)}
        />
        <Figure label="Concluídos" value={String(daily.previous.completed.length)} />
        <Figure label="Em andamento" value={String(daily.open.inProgress.length)} />
        <Figure label="Pedem atenção" value={String(notes.length)} alert={notes.length > 0} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <Column title={previousTitle} subtitle={dayName(daily.previousDate)}>
          <Block title="Concluídos" empty="Nenhum card concluído.">
            {daily.previous.completed.map((c) => (
              <CardLine key={c.id} card={c} note={activityNote(c)} />
            ))}
          </Block>
          <Block title="Trabalhou em" empty="Sem horas ou movimentações registradas.">
            {daily.previous.worked.map((c) => (
              <CardLine key={c.id} card={c} note={activityNote(c)} />
            ))}
          </Block>
        </Column>

        <Column title="Hoje" subtitle={dayName(daily.date)}>
          {daily.today.running && (
            <Paper radius="sm" p="xs" className="me__running">
              <Group gap={6} wrap="nowrap">
                <IconPlayerPlayFilled size={12} aria-hidden />
                <Text size="xs" fw={600}>
                  Timer rodando desde{' '}
                  {new Date(daily.today.running.startedAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Group>
              <CardLine card={daily.today.running.card} />
            </Paper>
          )}
          <Block title="Em andamento" empty="Nada em andamento.">
            {daily.open.inProgress.map((c) => (
              <CardLine key={c.id} card={c} note={c.column} />
            ))}
          </Block>
          {dueTodayOnly.length > 0 && (
            <Block title="Vence hoje">
              {dueTodayOnly.map((c) => (
                <CardLine key={c.id} card={c} note={c.column} />
              ))}
            </Block>
          )}
          <Block title="A fazer" empty="Nada a fazer.">
            {daily.open.todo.slice(0, 5).map((c) => (
              <CardLine key={c.id} card={c} note={c.sprint ? `sprint ${c.sprint}` : undefined} />
            ))}
            {daily.open.todo.length > 5 && (
              <Text size="xs" c="dimmed">
                e mais {daily.open.todo.length - 5}
              </Text>
            )}
          </Block>
          {doneToday.length > 0 && (
            <Block title={`Já feito hoje · ${hoursText(daily.today.seconds)}`}>
              {doneToday.map((c) => (
                <CardLine
                  key={c.id}
                  card={c}
                  note={[c.completed ? 'concluído' : '', activityNote(c)]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))}
            </Block>
          )}
          {daily.open.backlog.length > 0 && (
            <Text size="xs" c="dimmed">
              {daily.open.backlog.length} no backlog
            </Text>
          )}
        </Column>

        <Column title="Atenção" subtitle="impedimentos e riscos">
          {notes.length === 0 ? (
            <Text size="sm" c="dimmed">
              Nada atrasado, reprovado ou com bug aberto.
            </Text>
          ) : (
            <Stack gap={6}>
              {notes.map(({ card, note }) => (
                <CardLine key={card.id} card={card} note={note} alert />
              ))}
            </Stack>
          )}
        </Column>
      </SimpleGrid>
    </Stack>
  )
}

function Figure({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={700} c={alert ? 'red.7' : undefined}>
        {value}
      </Text>
    </Paper>
  )
}

function Column({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="md">
        <div>
          <Title order={4}>{title}</Title>
          <Text size="xs" c="dimmed">
            {subtitle}
          </Text>
        </div>
        {children}
      </Stack>
    </Paper>
  )
}

function Block({
  title,
  empty,
  children,
}: {
  title: string
  empty?: string
  children: ReactNode[] | ReactNode
}) {
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean)
  return (
    <Stack gap={6}>
      <Text size="xs" fw={600} tt="uppercase" c="dimmed" className="me__group-title">
        {title}
      </Text>
      {items.length > 0 ? (
        items
      ) : (
        <Text size="sm" c="dimmed">
          {empty}
        </Text>
      )}
    </Stack>
  )
}

function CardLine({
  card,
  note,
  alert,
}: {
  card: DailyCard | ActivityCard
  note?: string
  alert?: boolean
}) {
  return (
    <Link
      to={`/p/${card.project.key}/c/${card.number}`}
      className={`me__card${alert ? ' me__card--alert' : ''}`}
    >
      <Tooltip label={card.project.name} openDelay={400}>
        <span className="me__card-key">{card.key}</span>
      </Tooltip>
      <span className="me__card-body">
        <span className="me__card-title">
          {card.type === 'BUG' && <span className="me__card-bug">Bug</span>}
          {card.title}
        </span>
        {note && <span className="me__card-note">{note}</span>}
      </span>
    </Link>
  )
}
