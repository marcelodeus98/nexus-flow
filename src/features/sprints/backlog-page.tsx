import {
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from '@/shared/notify/toast'
import { useBoardOverview, type CardSummary } from '@/features/board/api'
import { estimateLabel } from '@/features/board/card-format'
import { useCan } from '@/features/projects/api'
import { useCurrentProject } from '@/features/projects/project-context'
import { apiErrorMessage } from '@/shared/api/errors'
import './backlog-page.css'
import {
  formatDay,
  statusLabels,
  useCloseSprint,
  useDeleteSprint,
  useSaveSprint,
  useSetSprintCards,
  useSprints,
  useStartSprint,
  type Sprint,
} from './api'

const BACKLOG = 'backlog'

// Planning: the active and planned sprints with their cards, the backlog
// (cards without a sprint that are not done) and the closed sprints'
// reports. Cards move between them with the "Mover para" selector.
export function BacklogPage() {
  const project = useCurrentProject()
  const can = useCan(project.key)
  // Sprints span the project: cards of every board.
  const board = useBoardOverview(project.id)
  const sprints = useSprints(project.id)
  const readOnly = project.status === 'ARCHIVED'
  const canManage = !readOnly && can('sprint:manage')
  const canPlan = !readOnly && can('backlog:prioritize')
  const [editing, setEditing] = useState<Sprint | null | undefined>(undefined)
  const [closing, setClosing] = useState<Sprint>()
  const start = useStartSprint(project.id)
  const remove = useDeleteSprint(project.id)
  const onError = (error: unknown) =>
    toast.error(
      apiErrorMessage(error, { 409: 'Encerre a sprint em andamento antes de iniciar outra.' }),
    )

  // Cards in board order: by column, then by rank inside it.
  const ordered = useMemo(() => {
    const columnOrder = new Map((board.data?.columns ?? []).map((c, i) => [c.id, i]))
    return [...(board.data?.cards ?? [])].sort(
      (a, b) => (columnOrder.get(a.columnId) ?? 0) - (columnOrder.get(b.columnId) ?? 0),
    )
  }, [board.data])
  const doneColumns = new Set(
    (board.data?.columns ?? []).filter((c) => c.category === 'DONE').map((c) => c.id),
  )
  // With several boards the column says which board it is on.
  const boardNames = new Map((board.data?.boards ?? []).map((b) => [b.id, b.name]))
  const manyBoards = boardNames.size > 1
  const columnNames = new Map(
    (board.data?.columns ?? []).map((c) => [
      c.id,
      manyBoards ? `${boardNames.get(c.boardId)} · ${c.name}` : c.name,
    ]),
  )

  const open = (sprints.data ?? []).filter((s) => s.status !== 'CLOSED')
  const closed = (sprints.data ?? []).filter((s) => s.status === 'CLOSED')
  const hasActive = open.some((s) => s.status === 'ACTIVE')
  const backlog = ordered.filter((card) => !card.sprintId && !doneColumns.has(card.columnId))

  const row = (card: CardSummary) => (
    <CardRow
      key={card.id}
      card={card}
      columnName={columnNames.get(card.columnId) ?? ''}
      sprints={open}
      editable={canPlan}
    />
  )

  if (board.isPending || sprints.isPending) {
    return (
      <Text size="sm" c="dimmed">
        Carregando…
      </Text>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" gap="md">
        <Text size="sm" c="dimmed">
          Planeje as sprints movendo cards do backlog. Só uma sprint fica em andamento por vez.
        </Text>
        {canManage && (
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
            Nova sprint
          </Button>
        )}
      </Group>

      {open.map((sprint) => {
        const cards = ordered.filter((card) => card.sprintId === sprint.id)
        return (
          <Panel
            key={sprint.id}
            title={sprint.name}
            subtitle={`${formatDay(sprint.startDate)} a ${formatDay(sprint.endDate)}${
              sprint.goal ? ` · ${sprint.goal}` : ''
            }`}
            badge={
              <Badge
                size="sm"
                variant={sprint.status === 'ACTIVE' ? 'filled' : 'light'}
                color={sprint.status === 'ACTIVE' ? undefined : 'gray'}
              >
                {statusLabels[sprint.status]}
              </Badge>
            }
            totals={totalsOf(cards)}
            actions={
              <>
                {sprint.status === 'ACTIVE' && (
                  <Button
                    size="xs"
                    variant="subtle"
                    component={Link}
                    to={`/p/${project.key}/sprints/${sprint.id}`}
                  >
                    Burndown
                  </Button>
                )}
                {canManage && (
                  <Button size="xs" variant="subtle" onClick={() => setEditing(sprint)}>
                    Editar
                  </Button>
                )}
                {canManage && sprint.status === 'PLANNED' && (
                  <>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => remove.mutate(sprint.id, { onError })}
                    >
                      Excluir
                    </Button>
                    <Button
                      size="xs"
                      disabled={hasActive || start.isPending}
                      title={hasActive ? 'Encerre a sprint em andamento primeiro' : undefined}
                      onClick={() => start.mutate(sprint.id, { onError })}
                    >
                      Iniciar
                    </Button>
                  </>
                )}
                {canManage && sprint.status === 'ACTIVE' && (
                  <Button size="xs" onClick={() => setClosing(sprint)}>
                    Encerrar
                  </Button>
                )}
              </>
            }
          >
            {cards.length === 0 ? (
              <EmptyRow>Nenhum card. Use “Mover para” no backlog abaixo.</EmptyRow>
            ) : (
              cards.map(row)
            )}
          </Panel>
        )
      })}

      <Panel
        title="Backlog"
        subtitle="Cards sem sprint que ainda não foram concluídos"
        totals={totalsOf(backlog)}
      >
        {backlog.length === 0 ? <EmptyRow>O backlog está vazio.</EmptyRow> : backlog.map(row)}
      </Panel>

      {closed.length > 0 && (
        <Stack gap="xs">
          <Text size="sm" fw={500} c="dimmed">
            Sprints encerradas
          </Text>
          <Paper withBorder radius="md">
            <ul className="backlog__rows">
              {closed.map((sprint) => (
                <li key={sprint.id}>
                  <Text size="sm" fw={500} style={{ flex: 1 }}>
                    {sprint.name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {formatDay(sprint.startDate)} a {formatDay(sprint.endDate)}
                  </Text>
                  <Button
                    size="xs"
                    variant="subtle"
                    component={Link}
                    to={`/p/${project.key}/sprints/${sprint.id}`}
                  >
                    Relatório
                  </Button>
                </li>
              ))}
            </ul>
          </Paper>
        </Stack>
      )}

      {editing !== undefined && (
        <SprintDialog
          projectId={project.id}
          sprint={editing ?? undefined}
          suggestedName={`Sprint ${(sprints.data?.length ?? 0) + 1}`}
          onClose={() => setEditing(undefined)}
        />
      )}
      {closing && (
        <CloseSprintDialog
          projectId={project.id}
          sprint={closing}
          unfinished={
            ordered.filter((c) => c.sprintId === closing.id && !doneColumns.has(c.columnId)).length
          }
          planned={open.filter((s) => s.status === 'PLANNED')}
          onClose={() => setClosing(undefined)}
        />
      )}
    </Stack>
  )

  function totalsOf(cards: CardSummary[]) {
    const points = cards.reduce((sum, c) => sum + (c.storyPoints ?? 0), 0)
    const minutes = cards.reduce((sum, c) => sum + (c.estimateMinutes ?? 0), 0)
    return `${cards.length} cards · ${points} pts · ${Math.round((minutes / 60) * 10) / 10} h`
  }
}

function Panel({
  title,
  subtitle,
  badge,
  totals,
  actions,
  children,
}: {
  title: string
  subtitle: string
  badge?: ReactNode
  totals: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <Paper withBorder radius="md" component="section">
      <Group gap="sm" px="md" py="sm" className="backlog__panel-header">
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <Title order={4}>{title}</Title>
            {badge}
          </Group>
          <Text size="xs" c="dimmed" truncate>
            {subtitle}
          </Text>
        </Stack>
        <Text size="xs" c="dimmed">
          {totals}
        </Text>
        {actions && <Group gap={4}>{actions}</Group>}
      </Group>
      <ul className="backlog__rows">{children}</ul>
    </Paper>
  )
}

function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <li>
      <Text size="sm" c="dimmed">
        {children}
      </Text>
    </li>
  )
}

function CardRow({
  card,
  columnName,
  sprints,
  editable,
}: {
  card: CardSummary
  columnName: string
  sprints: Sprint[]
  editable: boolean
}) {
  const project = useCurrentProject()
  const setCards = useSetSprintCards(project.id)
  const estimate = estimateLabel(card, project.defaultEstimateView)

  function moveTo(target: string | null) {
    if (!target) return
    const onError = (error: unknown) => toast.error(apiErrorMessage(error))
    if (target === BACKLOG) {
      if (card.sprintId)
        setCards.mutate({ sprintId: card.sprintId, remove: [card.id] }, { onError })
    } else {
      setCards.mutate({ sprintId: target, add: [card.id] }, { onError })
    }
  }

  return (
    <li>
      <Link to={`/p/${project.key}/c/${card.number}`} className="backlog__card-link">
        <Text span size="xs" c="dimmed" ff="monospace">
          {project.key}-{card.number}
        </Text>{' '}
        {card.title}
      </Link>
      <Text span size="xs" c="dimmed">
        {columnName}
      </Text>
      <Text span size="xs" w={56} ta="right">
        {estimate ?? '—'}
      </Text>
      {editable && (
        <Select
          size="xs"
          w={160}
          aria-label={`Mover ${project.key}-${card.number} para`}
          value={card.sprintId ?? BACKLOG}
          onChange={moveTo}
          disabled={setCards.isPending}
          allowDeselect={false}
          data={[
            { value: BACKLOG, label: 'Backlog' },
            ...sprints.map((sprint) => ({ value: sprint.id, label: sprint.name })),
          ]}
        />
      )}
    </li>
  )
}

function SprintDialog({
  projectId,
  sprint,
  suggestedName,
  onClose,
}: {
  projectId: string
  sprint?: Sprint
  suggestedName: string
  onClose: () => void
}) {
  const save = useSaveSprint(projectId)
  const [name, setName] = useState(sprint?.name ?? suggestedName)
  const [goal, setGoal] = useState(sprint?.goal ?? '')
  const [startDate, setStartDate] = useState(sprint?.startDate ?? '')
  const [endDate, setEndDate] = useState(sprint?.endDate ?? '')

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      { id: sprint?.id, name: name.trim(), goal: goal.trim() || null, startDate, endDate },
      {
        onSuccess: () => {
          toast.success(sprint ? 'Sprint atualizada.' : 'Sprint criada.')
          onClose()
        },
        onError: (error) =>
          toast.error(
            apiErrorMessage(error, { 400: 'A sprint precisa terminar depois de começar.' }),
          ),
      },
    )
  }

  return (
    <Modal opened onClose={onClose} title={sprint ? 'Editar sprint' : 'Nova sprint'}>
      <Stack component="form" gap="md" onSubmit={submit}>
        <TextInput
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
        />
        <Textarea
          label="Objetivo"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          autosize
          minRows={2}
          maxLength={500}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Início"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <TextInput
            label="Fim"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </SimpleGrid>
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={save.isPending}>
            Salvar
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

function CloseSprintDialog({
  projectId,
  sprint,
  unfinished,
  planned,
  onClose,
}: {
  projectId: string
  sprint: Sprint
  unfinished: number
  planned: Sprint[]
  onClose: () => void
}) {
  const close = useCloseSprint(projectId)
  const [destination, setDestination] = useState(planned[0]?.id ?? BACKLOG)

  return (
    <Modal opened onClose={onClose} title={`Encerrar ${sprint.name}?`}>
      <Stack gap="md">
        <Text size="sm">
          {unfinished === 0
            ? 'Todos os cards foram concluídos.'
            : `${unfinished} card(s) não foram concluídos. Para onde eles vão?`}
        </Text>
        {unfinished > 0 && (
          <Select
            aria-label="Destino dos cards não concluídos"
            value={destination}
            onChange={(value) => value && setDestination(value)}
            allowDeselect={false}
            data={[
              { value: BACKLOG, label: 'Voltar para o backlog' },
              ...planned.map((s) => ({ value: s.id, label: `Passar para ${s.name}` })),
            ]}
          />
        )}
        <Text size="sm" c="dimmed">
          O relatório da sprint guarda como cada card terminou, quanto escopo entrou depois do
          início e o tempo registrado.
        </Text>
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={close.isPending}
            onClick={() =>
              close.mutate(
                { id: sprint.id, nextSprintId: destination === BACKLOG ? null : destination },
                {
                  onSuccess: () => {
                    toast.success('Sprint encerrada.')
                    onClose()
                  },
                  onError: (error) => toast.error(apiErrorMessage(error)),
                },
              )
            }
          >
            Encerrar sprint
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
