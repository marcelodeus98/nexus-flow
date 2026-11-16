import {
  ActionIcon,
  Badge,
  Chip,
  CloseButton,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconBolt,
  IconHome,
  IconMinus,
  IconMoon,
  IconPlus,
  IconRotate,
  IconRotateClockwise,
  IconSearch,
  IconStack2,
  IconUsers,
} from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatHours } from '@/features/reports/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { useTeamMap, type MapCard, type MapPerson, type MapScope, type PersonStatus } from './api'
import { STATUS_COLOR, STATUS_LABEL, buildRooms, type Room } from './office-layout'
import { TeamMapScene, type MapCameraCommands, type MapSelection } from './team-map-scene'
import './team-map.css'

const STATUSES: PersonStatus[] = ['FOCUS', 'ACTIVE', 'IDLE']
const ALL = 'all'

const SCOPE_LABEL: Record<MapScope, { label: string; hint: string }> = {
  ADMIN: { label: 'Visão do administrador', hint: 'Todas as pessoas e todos os cards.' },
  LEADER: {
    label: 'Visão de líder',
    hint: 'Os times que você lidera, os projetos que você gerencia e os seus colegas de projeto.',
  },
  MEMBER: {
    label: 'Visão de membro',
    hint: 'As pessoas com quem você divide projetos. Cards de projetos em que você não está aparecem só na contagem.',
  },
}

// Ticks so timers and "há X min" stay current between refetches.
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function elapsed(fromIso: string, now: number) {
  const minutes = Math.max(0, Math.round((now - Date.parse(fromIso)) / 60_000))
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h} h`
}

function ago(iso: string | null, now: number) {
  if (!iso) return 'sem registro nos últimos 14 dias'
  const minutes = Math.round((now - Date.parse(iso)) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  return days === 1 ? 'ontem' : `há ${days} dias`
}

// "Mapa da equipe": each department is an office room with its people seated
// at workstations, and
// what each one is doing right now — timer running, cards in progress, or
// nothing. Admins see everyone; leaders their teams and projects; members
// their colleagues. Click a person or a room to fly there and see more.
export function TeamMapPage() {
  const map = useTeamMap()
  const now = useNow()
  const [selection, setSelection] = useState<MapSelection>(null)
  const [statuses, setStatuses] = useState<string[]>(STATUSES)
  const [projectId, setProjectId] = useState<string>(ALL)
  const [search, setSearch] = useState('')
  const commandsRef = useRef<MapCameraCommands | null>(null)

  const rooms = useMemo(() => (map.data ? buildRooms(map.data) : []), [map.data])
  const people = map.data?.people ?? []
  const count = (test: (p: MapPerson) => boolean) => people.filter(test).length

  const isDimmed = (person: MapPerson) =>
    !statuses.includes(person.status) ||
    (projectId !== ALL && !person.projectIds.includes(projectId))

  const selectedPerson =
    selection?.kind === 'person' ? (people.find((p) => p.id === selection.id) ?? null) : null
  const selectedRoom =
    selection?.kind === 'room' ? (rooms.find((i) => i.id === selection.id) ?? null) : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelection(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function selectPerson(id: string) {
    const person = people.find((p) => p.id === id)
    if (person && !statuses.includes(person.status)) setStatuses((s) => [...s, person.status])
    setSelection({ kind: 'person', id })
  }

  const searchOptions = people.map((p) => ({
    value: p.id,
    label: p.jobTitle ? `${p.name} · ${p.jobTitle}` : p.name,
  }))

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        <Group gap="sm" align="baseline" wrap="wrap">
          <Title order={2}>Mapa da equipe</Title>
          <Text c="dimmed" size="sm">
            Cada departamento é uma sala. Clique numa pessoa ou sala para ver os detalhes.
          </Text>
        </Group>
        <Group gap="xs">
          {map.data && (
            <Tooltip label={SCOPE_LABEL[map.data.scope].hint} multiline w={280} withArrow>
              <Badge variant="light" color="navy" radius="sm">
                {SCOPE_LABEL[map.data.scope].label}
              </Badge>
            </Tooltip>
          )}
          <span className="team-map__live">
            <span className="team-map__live-dot" />
            Ao vivo{' '}
            {new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </Group>
      </Group>

      <div className={`team-map${selection ? ' team-map--panel-open' : ''}`}>
        {map.data && (
          <TeamMapScene
            rooms={rooms}
            selection={selection}
            onSelect={setSelection}
            isDimmed={isDimmed}
            commandsRef={commandsRef}
          />
        )}

        {map.isPending && (
          <div className="team-map__center">
            <Loader size="sm" />
            <Text size="sm">Carregando a equipe…</Text>
          </div>
        )}
        {map.isError && (
          <div className="team-map__center">
            <Text size="sm" c="red">
              {apiErrorMessage(map.error)}
            </Text>
          </div>
        )}

        {map.data && (
          <>
            <div className="team-map__top-left">
              <div className="team-map__kpis">
                <Kpi
                  icon={<IconUsers size={20} />}
                  color="#05223f"
                  value={people.length}
                  label="Pessoas"
                  hint={`${rooms.length} ${rooms.length === 1 ? 'departamento' : 'departamentos'}`}
                  onClick={() => setStatuses(STATUSES)}
                />
                <Kpi
                  icon={<IconBolt size={20} />}
                  color={STATUS_COLOR.FOCUS}
                  value={count((p) => p.status === 'FOCUS')}
                  label="Em foco"
                  hint="com timer rodando"
                  onClick={() => setStatuses(['FOCUS'])}
                />
                <Kpi
                  icon={<IconStack2 size={20} />}
                  color={STATUS_COLOR.ACTIVE}
                  value={count((p) => p.status === 'ACTIVE')}
                  label="Em atividade"
                  hint="cards em andamento"
                  onClick={() => setStatuses(['ACTIVE'])}
                />
                <Kpi
                  icon={<IconMoon size={20} />}
                  color="#64748b"
                  value={count((p) => p.status === 'IDLE')}
                  label="Sem atividade"
                  hint="nada em andamento"
                  onClick={() => setStatuses(['IDLE'])}
                />
                <Kpi
                  icon={<IconAlertTriangle size={20} />}
                  color="#dc2626"
                  value={count((p) => p.overdue > 0)}
                  label="Com atraso"
                  hint="cards com prazo vencido"
                />
              </div>

              <div className="team-map__toolbar">
                <Select
                  placeholder="Buscar pessoa…"
                  aria-label="Buscar pessoa"
                  leftSection={<IconSearch size={15} />}
                  searchable
                  // Ids as values: two people may share a name.
                  data={searchOptions}
                  value={null}
                  searchValue={search}
                  onSearchChange={setSearch}
                  onChange={(id) => {
                    if (id) selectPerson(id)
                    setSearch('')
                  }}
                  nothingFoundMessage="Ninguém encontrado"
                  limit={8}
                  size="xs"
                  w={220}
                  comboboxProps={{ zIndex: 40 }}
                />
                <Select
                  aria-label="Projeto"
                  size="xs"
                  w={200}
                  value={projectId}
                  onChange={(v) => setProjectId(v ?? ALL)}
                  allowDeselect={false}
                  comboboxProps={{ zIndex: 40 }}
                  data={[
                    { value: ALL, label: 'Todos os projetos' },
                    ...map.data.projects.map((p) => ({
                      value: p.id,
                      label: `${p.key} · ${p.name}`,
                    })),
                  ]}
                />
                <Chip.Group multiple value={statuses} onChange={setStatuses}>
                  <Group gap={6}>
                    {STATUSES.map((status) => (
                      <Chip
                        key={status}
                        value={status}
                        size="xs"
                        radius="sm"
                        variant="light"
                        color={STATUS_COLOR[status]}
                      >
                        {STATUS_LABEL[status]}
                      </Chip>
                    ))}
                  </Group>
                </Chip.Group>
              </div>
            </div>

            <div className="team-map__right">
              <div className="team-map__controls">
                <Control label="Aproximar" onClick={() => commandsRef.current?.zoom(0.7)}>
                  <IconPlus size={18} />
                </Control>
                <Control label="Afastar" onClick={() => commandsRef.current?.zoom(1.4)}>
                  <IconMinus size={18} />
                </Control>
                <span className="team-map__controls-sep" />
                <Control
                  label="Girar à esquerda"
                  onClick={() => commandsRef.current?.rotate(-Math.PI / 6)}
                >
                  <IconRotate size={18} />
                </Control>
                <Control
                  label="Girar à direita"
                  onClick={() => commandsRef.current?.rotate(Math.PI / 6)}
                >
                  <IconRotateClockwise size={18} />
                </Control>
                <Control
                  label="Visão geral"
                  onClick={() => {
                    setSelection(null)
                    commandsRef.current?.reset()
                  }}
                >
                  <IconHome size={18} />
                </Control>
              </div>

              {selectedPerson && (
                <PersonPanel
                  key={selectedPerson.id}
                  person={selectedPerson}
                  room={rooms.find((i) => i.spots.some((s) => s.person.id === selectedPerson.id))}
                  now={now}
                  onClose={() => setSelection(null)}
                />
              )}
              {selectedRoom && (
                <RoomPanel
                  room={selectedRoom}
                  now={now}
                  onClose={() => setSelection(null)}
                  onSelectPerson={selectPerson}
                />
              )}
            </div>

            <div className="team-map__legend">
              {STATUSES.map((status) => (
                <span key={status}>
                  <i style={{ background: STATUS_COLOR[status] }} />
                  {STATUS_LABEL[status]}
                </span>
              ))}
              <span>
                <i style={{ background: '#dc2626' }} />
                Card atrasado
              </span>
              <span>
                <i className="team-map__legend-ring" />
                Você
              </span>
              <span className="team-map__legend-hint">
                Blocos azuis flutuando: cards em andamento · arraste para girar · role para zoom
              </span>
            </div>
          </>
        )}
      </div>
    </Stack>
  )
}

function Kpi({
  icon,
  color,
  value,
  label,
  hint,
  onClick,
}: {
  icon: ReactNode
  color: string
  value: number
  label: string
  hint: string
  onClick?: () => void
}) {
  return (
    <button type="button" className="team-map__kpi" onClick={onClick} disabled={!onClick}>
      <span className="team-map__kpi-icon" style={{ color, background: `${color}1a` }}>
        {icon}
      </span>
      <span className="team-map__kpi-body">
        <span className="team-map__kpi-label">{label}</span>
        <span className="team-map__kpi-value">{value}</span>
        <span className="team-map__kpi-hint">{hint}</span>
      </span>
    </button>
  )
}

function Control({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip label={label} position="left">
      <ActionIcon variant="subtle" color="dark" onClick={onClick} aria-label={label}>
        {children}
      </ActionIcon>
    </Tooltip>
  )
}

function CardLink({ card }: { card: MapCard }) {
  return (
    <Link to={`/p/${card.project.key}/c/${card.number}`} className="team-map__card">
      <span className="team-map__card-key">{card.key}</span>
      <span className="team-map__card-body">
        <span className="team-map__card-title">
          {card.type === 'BUG' && <span className="team-map__card-bug">Bug</span>}
          {card.title}
        </span>
        <span className="team-map__card-note">
          {card.column} · {card.project.name}
        </span>
      </span>
    </Link>
  )
}

function PersonPanel({
  person,
  room,
  now,
  onClose,
}: {
  person: MapPerson
  room: Room | undefined
  now: number
  onClose: () => void
}) {
  const color = STATUS_COLOR[person.status]
  const running = person.timer ? (now - Date.parse(person.timer.startedAt)) / 1000 : 0
  return (
    <div className="team-map__panel" role="dialog" aria-label={person.name}>
      <div className="team-map__panel-head">
        <span className="team-map__avatar" style={{ background: color }}>
          {person.name
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('')}
        </span>
        <div className="team-map__panel-title">
          <span className="team-map__overline" style={{ color }}>
            {STATUS_LABEL[person.status]}
          </span>
          <strong>
            {person.name}
            {person.isMe && ' (você)'}
          </strong>
          <span>{[person.jobTitle, room?.name].filter(Boolean).join(' · ') || '—'}</span>
        </div>
        <CloseButton onClick={onClose} aria-label="Fechar" />
      </div>

      {person.teams.length > 0 && (
        <Group gap={4} mt="xs">
          {person.teams.map((team) => (
            <Badge key={team} size="xs" variant="light">
              {team}
            </Badge>
          ))}
        </Group>
      )}

      <div className="team-map__stats">
        <div>
          <strong>{formatHours(person.todaySeconds + running)}</strong>
          <span>hoje</span>
        </div>
        <div>
          <strong>{person.openCards}</strong>
          <span>cards abertos</span>
        </div>
        <div>
          <strong style={{ color: person.overdue ? '#dc2626' : undefined }}>
            {person.overdue}
          </strong>
          <span>atrasados</span>
        </div>
      </div>

      {person.timer && (
        <div className="team-map__section">
          <Text size="xs" fw={700} c={STATUS_COLOR.FOCUS}>
            Timer rodando há {elapsed(person.timer.startedAt, now)}
          </Text>
          {person.timer.card ? (
            <CardLink card={person.timer.card} />
          ) : (
            <Text size="xs" c="dimmed">
              Num card de um projeto em que você não está.
            </Text>
          )}
        </div>
      )}

      <div className="team-map__section">
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          Em andamento
        </Text>
        {person.inProgress.length === 0 && person.hiddenInProgress === 0 && (
          <Text size="sm" c="dimmed">
            Nenhum card em andamento.
          </Text>
        )}
        {person.inProgress.map((card) => (
          <CardLink key={card.id} card={card} />
        ))}
        {person.hiddenInProgress > 0 && (
          <Text size="xs" c="dimmed">
            + {person.hiddenInProgress} {person.hiddenInProgress === 1 ? 'card' : 'cards'} em
            projetos que você não acompanha
          </Text>
        )}
      </div>

      <Text size="xs" c="dimmed" mt="sm">
        Última atividade: {ago(person.lastActivityAt, now)}
      </Text>
      {person.isMe && (
        <Link to="/me" className="text-link team-map__me-link">
          Abrir minha daily
        </Link>
      )}
    </div>
  )
}

function RoomPanel({
  room,
  now,
  onClose,
  onSelectPerson,
}: {
  room: Room
  now: number
  onClose: () => void
  onSelectPerson: (id: string) => void
}) {
  const people = room.spots.map((s) => s.person)
  const of = (status: PersonStatus) => people.filter((p) => p.status === status).length
  return (
    <div className="team-map__panel" role="dialog" aria-label={room.name}>
      <div className="team-map__panel-head">
        <span className="team-map__avatar" style={{ background: room.color }}>
          <IconUsers size={20} />
        </span>
        <div className="team-map__panel-title">
          <span className="team-map__overline" style={{ color: room.color }}>
            Departamento
          </span>
          <strong>{room.name}</strong>
          <span>
            {people.length} {people.length === 1 ? 'pessoa' : 'pessoas'}
          </span>
        </div>
        <CloseButton onClick={onClose} aria-label="Fechar" />
      </div>
      <div className="team-map__stats">
        {STATUSES.map((status) => (
          <div key={status}>
            <strong style={{ color: STATUS_COLOR[status] }}>{of(status)}</strong>
            <span>{STATUS_LABEL[status].toLowerCase()}</span>
          </div>
        ))}
      </div>
      <div className="team-map__section">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            className="team-map__person-row"
            onClick={() => onSelectPerson(p.id)}
          >
            <i style={{ background: STATUS_COLOR[p.status] }} />
            <span className="team-map__person-name">
              {p.name}
              {p.isMe && ' (você)'}
            </span>
            <span className="team-map__person-note">
              {p.timer
                ? `foco há ${elapsed(p.timer.startedAt, now)}`
                : p.status === 'ACTIVE'
                  ? `${p.inProgress.length + p.hiddenInProgress} em andamento`
                  : 'sem atividade'}
              {p.overdue > 0 && ` · ${p.overdue} atrasado${p.overdue > 1 ? 's' : ''}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
