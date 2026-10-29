import { PlusIcon } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { FormField } from '@/features/admin/form-field'
import { useBoard, type CardSummary } from '@/features/board/api'
import { estimateLabel } from '@/features/board/card-format'
import { useCan } from '@/features/projects/api'
import { useCurrentProject } from '@/features/projects/project-context'
import { apiErrorMessage } from '@/shared/api/errors'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
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
  const board = useBoard(project.id)
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
  const columnNames = new Map((board.data?.columns ?? []).map((c) => [c.id, c.name]))

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
    return <p className="text-sm text-muted-foreground">Carregando…</p>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Planeje as sprints movendo cards do backlog. Só uma sprint fica em andamento por vez.
        </p>
        {canManage && (
          <Button onClick={() => setEditing(null)}>
            <PlusIcon /> Nova sprint
          </Button>
        )}
      </div>

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
              <Badge variant={sprint.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {statusLabels[sprint.status]}
              </Badge>
            }
            totals={totalsOf(cards)}
            actions={
              <>
                {sprint.status === 'ACTIVE' && (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/p/${project.key}/sprints/${sprint.id}`}>Burndown</Link>
                  </Button>
                )}
                {canManage && (
                  <Button size="sm" variant="ghost" onClick={() => setEditing(sprint)}>
                    Editar
                  </Button>
                )}
                {canManage && sprint.status === 'PLANNED' && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove.mutate(sprint.id, { onError })}
                    >
                      Excluir
                    </Button>
                    <Button
                      size="sm"
                      disabled={hasActive || start.isPending}
                      title={hasActive ? 'Encerre a sprint em andamento primeiro' : undefined}
                      onClick={() => start.mutate(sprint.id, { onError })}
                    >
                      Iniciar
                    </Button>
                  </>
                )}
                {canManage && sprint.status === 'ACTIVE' && (
                  <Button size="sm" onClick={() => setClosing(sprint)}>
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
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Sprints encerradas</h2>
          <ul className="divide-y rounded-lg border bg-background text-sm">
            {closed.map((sprint) => (
              <li key={sprint.id} className="flex items-center gap-3 px-3 py-2">
                <span className="flex-1 font-medium">{sprint.name}</span>
                <span className="text-muted-foreground">
                  {formatDay(sprint.startDate)} a {formatDay(sprint.endDate)}
                </span>
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`/p/${project.key}/sprints/${sprint.id}`}>Relatório</Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
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
    </div>
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
    <section className="rounded-xl border bg-background">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 font-semibold">
            {title} {badge}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{totals}</span>
        {actions && <div className="flex gap-1">{actions}</div>}
      </header>
      <ul className="divide-y">{children}</ul>
    </section>
  )
}

function EmptyRow({ children }: { children: ReactNode }) {
  return <li className="px-4 py-3 text-sm text-muted-foreground">{children}</li>
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

  function moveTo(target: string) {
    const onError = (error: unknown) => toast.error(apiErrorMessage(error))
    if (target === BACKLOG) {
      if (card.sprintId)
        setCards.mutate({ sprintId: card.sprintId, remove: [card.id] }, { onError })
    } else {
      setCards.mutate({ sprintId: target, add: [card.id] }, { onError })
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
      <Link to={`/p/${project.key}/c/${card.number}`} className="min-w-0 flex-1 hover:underline">
        <span className="font-mono text-xs text-muted-foreground">
          {project.key}-{card.number}
        </span>{' '}
        {card.title}
      </Link>
      <span className="text-xs text-muted-foreground">{columnName}</span>
      <span className="w-14 text-right text-xs tabular-nums">{estimate ?? '—'}</span>
      {editable && (
        <Select
          value={card.sprintId ?? BACKLOG}
          onValueChange={moveTo}
          disabled={setCards.isPending}
        >
          <SelectTrigger
            size="sm"
            className="w-40"
            aria-label={`Mover ${project.key}-${card.number} para`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BACKLOG}>Backlog</SelectItem>
            {sprints.map((sprint) => (
              <SelectItem key={sprint.id} value={sprint.id}>
                {sprint.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{sprint ? 'Editar sprint' : 'Nova sprint'}</DialogTitle>
          </DialogHeader>
          <FormField label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
          </FormField>
          <FormField label="Objetivo">
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Início">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Fim">
              <Input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar {sprint.name}?</DialogTitle>
          <DialogDescription>
            {unfinished === 0
              ? 'Todos os cards foram concluídos.'
              : `${unfinished} card(s) não foram concluídos. Para onde eles vão?`}
          </DialogDescription>
        </DialogHeader>
        {unfinished > 0 && (
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger className="w-full" aria-label="Destino dos cards não concluídos">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BACKLOG}>Voltar para o backlog</SelectItem>
              {planned.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Passar para {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-sm text-muted-foreground">
          O relatório da sprint guarda como cada card terminou, quanto escopo entrou depois do
          início e o tempo registrado.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={close.isPending}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
