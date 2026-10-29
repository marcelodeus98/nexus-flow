import { BellIcon, BellOffIcon, ChevronDownIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useDepartments } from '@/features/admin/api'
import {
  priorityLabels,
  useBoard,
  useMoveCard,
  useTags,
  type CardDepartmentRole,
  type CardPriority,
} from '@/features/board/api'
import { useCan, useProjectMe, useProjectMembers } from '@/features/projects/api'
import { moveErrorMessage } from '@/features/board/move-errors'
import { useCurrentProject } from '@/features/projects/project-context'
import { apiErrorMessage } from '@/shared/api/errors'
import { useSessionState } from '@/shared/auth/session-store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { ApiError } from '@/shared/api/http'
import {
  useCardActivity,
  useCardByNumber,
  useDeleteCard,
  useSetWatching,
  useUpdateCard,
  type ActivityEntry,
  type CardDetail,
  type CardPatch,
} from './api'
import { DescriptionEditor } from './description-editor'
import { AttachmentsSection } from './sections/attachments-section'
import { ChecklistSection } from './sections/checklist-section'
import { CommentsSection } from './sections/comments-section'
import { SprintField } from './sections/sprint-field'
import { TimeSection } from './sections/time-section'

const departmentRoleLabels: Record<CardDepartmentRole, string> = {
  ORIGIN: 'Origem',
  TARGET: 'Destino',
  INVOLVED: 'Envolvido',
}

// /p/:projectKey/c/:cardNumber — the card in a side panel over the board, so
// the link can be shared and the board stays in place behind it.
export function CardDrawer() {
  const project = useCurrentProject()
  const { cardNumber } = useParams()
  const navigate = useNavigate()
  const card = useCardByNumber(project.id, Number(cardNumber))
  const close = () => void navigate(`/p/${project.key}`)

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent
        className="w-full gap-0 overflow-y-auto sm:max-w-xl"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        {card.isPending && (
          <SheetHeader>
            <SheetTitle>Carregando…</SheetTitle>
          </SheetHeader>
        )}
        {card.isError && (
          <SheetHeader>
            <SheetTitle>
              {card.error instanceof ApiError && card.error.status === 404
                ? 'Card não encontrado'
                : 'Não foi possível abrir o card'}
            </SheetTitle>
            <SheetDescription>{apiErrorMessage(card.error)}</SheetDescription>
          </SheetHeader>
        )}
        {card.data && <CardDetailView card={card.data} onClose={close} />}
      </SheetContent>
    </Sheet>
  )
}

function CardDetailView({ card, onClose }: { card: CardDetail; onClose: () => void }) {
  const project = useCurrentProject()
  const can = useCan(project.key)
  const board = useBoard(project.id)
  const tags = useTags(project.id)
  const members = useProjectMembers(project.id)
  const departments = useDepartments()
  const session = useSessionState()
  const userId = session.status === 'authenticated' ? session.session.user.id : ''
  const update = useUpdateCard(project.id, card)
  const remove = useDeleteCard(project.id)
  const watch = useSetWatching(project.id, card)
  const moveCard = useMoveCard(project.id, (error) => toast.error(moveErrorMessage(error)))

  const readOnly = project.status === 'ARCHIVED'
  const editable = !readOnly && can('card:edit')
  const movable = !readOnly && can('card:move')
  const watching = card.watcherIds.includes(userId)
  const me = useProjectMe(project.key)
  const isModerator = Boolean(me.data?.isAdmin || me.data?.role === 'MANAGER')
  const usesSprints = project.methodology !== 'KANBAN'
  const canPlan = !readOnly && can('backlog:prioritize')

  function save(patch: CardPatch) {
    update.mutate(patch, {
      onError: (error) =>
        toast.error(
          apiErrorMessage(error, {
            412: 'Outra pessoa alterou este card. Carregamos a versão atual; refaça a alteração.',
          }),
        ),
    })
  }

  const memberList = members.data?.members ?? []
  const columns = board.data?.columns ?? []

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-mono text-xs text-muted-foreground">
            {project.key}-{card.number}
            {card.parent && (
              <>
                {' · filho de '}
                <Link to={`/p/${project.key}/c/${card.parent.number}`} className="underline">
                  {project.key}-{card.parent.number}
                </Link>
              </>
            )}
          </p>
          <SheetTitle asChild>
            <TitleField
              key={card.version}
              value={card.title}
              editable={editable}
              onSave={(title) => save({ title })}
            />
          </SheetTitle>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Fechar" onClick={onClose}>
          <XIcon />
        </Button>
      </div>

      <dl className="grid grid-cols-[8rem_1fr] items-center gap-x-3 gap-y-3 text-sm">
        <Row label="Coluna">
          <Select
            value={card.columnId}
            disabled={!movable}
            onValueChange={(columnId) => moveCard({ cardId: card.id, columnId })}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.map((column) => (
                <SelectItem key={column.id} value={column.id}>
                  {column.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Prioridade">
          <Select
            value={card.priority}
            disabled={!editable}
            onValueChange={(priority) => save({ priority: priority as CardPriority })}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Story points">
          <NumberField
            key={`sp-${card.version}`}
            value={card.storyPoints}
            step={0.5}
            editable={editable}
            onSave={(storyPoints) => save({ storyPoints })}
          />
        </Row>
        <Row label="Estimativa (h)">
          <NumberField
            key={`h-${card.version}`}
            value={card.estimateMinutes === null ? null : card.estimateMinutes / 60}
            step={0.25}
            editable={editable}
            onSave={(hours) =>
              save({ estimateMinutes: hours === null ? null : Math.round(hours * 60) })
            }
          />
        </Row>
        <Row label="Prazo">
          <Input
            key={`due-${card.version}`}
            type="date"
            className="h-7"
            disabled={!editable}
            defaultValue={card.dueDate?.slice(0, 10) ?? ''}
            onBlur={(e) => {
              const value = e.target.value || null
              if (value !== (card.dueDate?.slice(0, 10) ?? null)) save({ dueDate: value })
            }}
          />
        </Row>
        <Row label="Responsáveis">
          <MultiPicker
            label="Responsáveis"
            disabled={!editable}
            options={memberList.map((m) => ({ id: m.user.id, label: m.user.name }))}
            selected={card.assigneeIds}
            onChange={(assigneeIds) => save({ assigneeIds })}
          />
        </Row>
        <Row label="Tags">
          <MultiPicker
            label="Tags"
            disabled={!editable}
            options={(tags.data ?? []).map((tag) => ({
              id: tag.id,
              label: tag.name,
              color: tag.color,
            }))}
            selected={card.tagIds}
            onChange={(tagIds) => save({ tagIds })}
          />
        </Row>
        <Row label="Departamentos">
          <DepartmentsField
            value={card.departments}
            options={departments.data ?? []}
            editable={editable}
            onChange={(value) => save({ departments: value })}
          />
        </Row>
        {usesSprints && (
          <Row label="Sprint">
            <SprintField projectId={project.id} card={card} editable={canPlan} />
          </Row>
        )}
      </dl>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Descrição</h3>
        <DescriptionEditor
          key={card.version}
          value={card.description}
          editable={editable}
          saving={update.isPending}
          onSave={(description) => save({ description })}
        />
      </section>

      {card.children.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Subtarefas</h3>
          <ul className="space-y-1 text-sm">
            {card.children.map((child) => (
              <li key={child.id}>
                <Link to={`/p/${project.key}/c/${child.number}`} className="hover:underline">
                  <span className="font-mono text-xs text-muted-foreground">
                    {project.key}-{child.number}
                  </span>{' '}
                  {child.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ChecklistSection projectId={project.id} card={card} editable={editable} />

      <TimeSection card={card} canLog={!readOnly && can('time:log')} userId={userId} />

      <AttachmentsSection
        cardId={card.id}
        userId={userId}
        canEdit={editable}
        canModerate={isModerator}
      />

      <CommentsSection
        cardId={card.id}
        members={memberList.map((m) => ({ id: m.user.id, label: m.user.name }))}
        userId={userId}
        canComment={!readOnly && can('comment:create')}
        canModerate={isModerator}
      />

      <Activity cardId={card.id} />

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={watch.isPending}
          onClick={() => watch.mutate(!watching)}
        >
          {watching ? <BellOffIcon /> : <BellIcon />}
          {watching ? 'Deixar de seguir' : 'Seguir'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Criado {card.createdBy && `por ${card.createdBy.name} `}em{' '}
          {new Date(card.createdAt).toLocaleDateString('pt-BR')}
        </span>
        {editable && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="ml-auto">
                <Trash2Icon /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Excluir {project.key}-{card.number}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  O card sai do board. O número e o histórico ficam guardados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    remove.mutate(card.id, {
                      onSuccess: () => {
                        toast.success('Card excluído.')
                        onClose()
                      },
                      onError: (error) => toast.error(apiErrorMessage(error)),
                    })
                  }
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  )
}

function TitleField({
  value,
  editable,
  onSave,
  ...props
}: {
  value: string
  editable: boolean
  onSave: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    else setDraft(value)
  }
  if (!editable) {
    return (
      <h2 className="text-lg leading-snug font-semibold break-words" {...props}>
        {value}
      </h2>
    )
  }
  return (
    <h2 {...props}>
      <textarea
        aria-label="Título"
        value={draft}
        rows={1}
        maxLength={200}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') setDraft(value)
        }}
        className="field-sizing-content w-full resize-none rounded-md px-1 py-0.5 text-lg leading-snug font-semibold outline-none hover:bg-muted focus:bg-background focus:ring-2 focus:ring-ring/50"
      />
    </h2>
  )
}

function NumberField({
  value,
  step,
  editable,
  onSave,
}: {
  value: number | null
  step: number
  editable: boolean
  onSave: (value: number | null) => void
}) {
  return (
    <Input
      type="number"
      min={0}
      step={step}
      className="h-7"
      disabled={!editable}
      defaultValue={value ?? ''}
      placeholder="—"
      onBlur={(e) => {
        const next = e.target.value === '' ? null : Number(e.target.value)
        if (next !== value && (next === null || Number.isFinite(next))) onSave(next)
      }}
    />
  )
}

function MultiPicker({
  label,
  options,
  selected,
  disabled,
  onChange,
}: {
  label: string
  options: { id: string; label: string; color?: string }[]
  selected: string[]
  disabled: boolean
  onChange: (ids: string[]) => void
}) {
  // Changes are collected while the menu is open and saved once on close.
  const [draft, setDraft] = useState<string[] | null>(null)
  const current = draft ?? selected
  const names = options.filter((o) => current.includes(o.id))

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) return setDraft(selected)
        if (draft && [...draft].sort().join() !== [...selected].sort().join()) onChange(draft)
        setDraft(null)
      }}
    >
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="outline" size="sm" className="h-auto min-h-7 w-full justify-between py-1">
          <span className="flex flex-wrap gap-1 text-left">
            {names.length === 0 && <span className="text-muted-foreground">Nenhum</span>}
            {names.map((option) => (
              <span
                key={option.id}
                className="rounded bg-muted px-1.5 text-xs"
                style={
                  option.color
                    ? { backgroundColor: `${option.color}22`, color: option.color }
                    : undefined
                }
              >
                {option.label}
              </span>
            ))}
          </span>
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-64 overflow-y-auto">
        {options.length === 0 && (
          <DropdownMenuItem disabled>Nada para escolher em {label.toLowerCase()}</DropdownMenuItem>
        )}
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={current.includes(option.id)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(checked) =>
              setDraft(checked ? [...current, option.id] : current.filter((id) => id !== option.id))
            }
          >
            {option.color && (
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: option.color }}
                aria-hidden
              />
            )}
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DepartmentsField({
  value,
  options,
  editable,
  onChange,
}: {
  value: CardDetail['departments']
  options: { id: string; name: string; color: string }[]
  editable: boolean
  onChange: (value: CardDetail['departments']) => void
}) {
  const byId = new Map(options.map((d) => [d.id, d]))
  const available = options.filter((d) => !value.some((v) => v.departmentId === d.id))

  return (
    <div className="space-y-1.5">
      {value.map((entry) => {
        const department = byId.get(entry.departmentId)
        return (
          <div key={entry.departmentId} className="flex items-center gap-2">
            <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 truncate">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: department?.color }}
                aria-hidden
              />
              {department?.name ?? '—'}
            </span>
            <Select
              value={entry.role}
              disabled={!editable}
              onValueChange={(role) =>
                onChange(
                  value.map((v) =>
                    v.departmentId === entry.departmentId
                      ? { ...v, role: role as CardDepartmentRole }
                      : v,
                  ),
                )
              }
            >
              <SelectTrigger size="sm" className="w-28" aria-label={`Papel de ${department?.name}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(departmentRoleLabels).map(([role, label]) => (
                  <SelectItem key={role} value={role}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editable && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Remover ${department?.name}`}
                onClick={() => onChange(value.filter((v) => v.departmentId !== entry.departmentId))}
              >
                <XIcon />
              </Button>
            )}
          </div>
        )
      })}
      {editable && available.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="xs" className="text-muted-foreground">
              + Adicionar departamento
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {available.map((department) => (
              <DropdownMenuItem
                key={department.id}
                onSelect={() =>
                  onChange([
                    ...value,
                    {
                      departmentId: department.id,
                      role: value.length === 0 ? 'ORIGIN' : 'INVOLVED',
                    },
                  ])
                }
              >
                {department.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {!editable && value.length === 0 && <span className="text-muted-foreground">Nenhum</span>}
    </div>
  )
}

const fieldLabels: Record<string, string> = {
  title: 'título',
  priority: 'prioridade',
  storyPoints: 'story points',
  estimateMinutes: 'estimativa',
  dueDate: 'prazo',
  parentId: 'card pai',
  assigneeIds: 'responsáveis',
  tagIds: 'tags',
  departments: 'departamentos',
}

function describe(entry: ActivityEntry): string {
  const meta = entry.metadata ?? {}
  switch (entry.action) {
    case 'card.created':
      return 'criou o card'
    case 'card.moved': {
      const from = (meta.from as { name?: string } | undefined)?.name
      const to = (meta.to as { name?: string } | undefined)?.name
      return `moveu de ${from ?? '?'} para ${to ?? '?'}`
    }
    case 'card.updated': {
      const fields = Object.keys(meta).map((field) => fieldLabels[field] ?? field)
      return fields.length ? `alterou ${fields.join(', ')}` : 'editou o card'
    }
    case 'card.deleted':
      return 'excluiu o card'
    default:
      return entry.action
  }
}

function Activity({ cardId }: { cardId: string }) {
  const activity = useCardActivity(cardId)
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Histórico</h3>
      <ol className="space-y-1.5 text-sm">
        {activity.data?.map((entry) => (
          <li key={entry.id} className="flex gap-2">
            <span className="text-muted-foreground tabular-nums">
              {new Date(entry.createdAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span>
              <span className="font-medium">{entry.actor?.name ?? 'Sistema'}</span>{' '}
              {describe(entry)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
