import {
  closestCorners,
  DndContext,
  pointerWithin,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMemo, useState } from 'react'
import { Link, Outlet } from 'react-router'
import { toast } from 'sonner'
import { useCan, useProjectMembers } from '@/features/projects/api'
import { useCurrentProject } from '@/features/projects/project-context'
import { formatDay, useSprints } from '@/features/sprints/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { useSessionState } from '@/shared/auth/session-store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useBoard, useMoveCard, useTags, type CardSummary } from './api'
import { CardFace, type CardLookups } from './board-card'
import { moveErrorMessage } from './move-errors'
import { matchesFilter, useBoardFilter } from './board-filter'
import { BoardFilters } from './board-filters'
import { isoDay } from './card-format'
import { BoardColumn } from './board-column'

type Placement = Record<string, string[]>

// Whatever is under the pointer wins (a card, else its column); closest
// corners only when the pointer is outside every droppable, e.g. with the
// keyboard or between columns.
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : closestCorners(args)
}

export function BoardPage() {
  const project = useCurrentProject()
  const board = useBoard(project.id)
  const tags = useTags(project.id)
  const members = useProjectMembers(project.id)
  const can = useCan(project.key)
  const readOnly = project.status === 'ARCHIVED'
  const moveCard = useMoveCard(project.id, (error) => toast.error(moveErrorMessage(error)))

  // While dragging: the order the user sees, column by column.
  const [dragging, setDragging] = useState<{ cardId: string; placement: Placement } | null>(null)
  const [mobileColumnId, setMobileColumnId] = useState<string>()

  // Scrum works on the active sprint; Hybrid shows everything by default.
  const usesSprints = project.methodology !== 'KANBAN'
  const sprints = useSprints(project.id)
  const activeSprint = sprints.data?.find((sprint) => sprint.status === 'ACTIVE')
  const [scope, setScope] = useState<'sprint' | 'all'>(
    project.methodology === 'SCRUM' ? 'sprint' : 'all',
  )
  const sprintFilter = usesSprints && scope === 'sprint' ? (activeSprint?.id ?? null) : undefined

  // Fixed for the life of the page; a board open overnight shows yesterday's
  // "overdue" until it is reloaded.
  const [today] = useState(() => isoDay(new Date()))
  const { filter, active: filtering } = useBoardFilter()
  const session = useSessionState()
  const userId = session.status === 'authenticated' ? session.session.user.id : ''
  const lookups = useMemo<CardLookups>(
    () => ({
      projectKey: project.key,
      estimateView: project.defaultEstimateView,
      tagsById: new Map((tags.data ?? []).map((tag) => [tag.id, tag])),
      membersById: new Map((members.data?.members ?? []).map((m) => [m.user.id, m.user])),
      today,
    }),
    [project.key, project.defaultEstimateView, tags.data, members.data, today],
  )

  const cardsById = useMemo(
    () => new Map((board.data?.cards ?? []).map((card) => [card.id, card])),
    [board.data],
  )
  // Card ids per column, in rank order (cheap even for 500 cards).
  const placementFromCache: Placement = {}
  for (const column of board.data?.columns ?? []) placementFromCache[column.id] = []
  for (const card of board.data?.cards ?? []) {
    // undefined: no filter; null: no active sprint, so nothing to show.
    if (sprintFilter !== undefined && card.sprintId !== sprintFilter) continue
    if (filtering && !matchesFilter(card, filter, { userId, today })) continue
    placementFromCache[card.columnId]?.push(card.id)
  }
  const placement = dragging?.placement ?? placementFromCache

  const sensors = useSensors(
    // A small distance keeps clicks (open the card) apart from drags.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const columnOf = (id: string, current: Placement) =>
    id in current ? id : Object.keys(current).find((columnId) => current[columnId].includes(id))

  function onDragStart({ active }: DragStartEvent) {
    setDragging({ cardId: String(active.id), placement: placementFromCache })
  }

  // Crossing into another column: move the card there in the local order.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !dragging) return
    const from = columnOf(String(active.id), dragging.placement)
    const to = columnOf(String(over.id), dragging.placement)
    if (!from || !to || from === to) return
    const target = dragging.placement[to]
    const overIndex = target.indexOf(String(over.id))
    const index = overIndex === -1 ? target.length : overIndex
    setDragging({
      ...dragging,
      placement: {
        ...dragging.placement,
        [from]: dragging.placement[from].filter((id) => id !== active.id),
        [to]: [...target.slice(0, index), String(active.id), ...target.slice(index)],
      },
    })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const state = dragging
    setDragging(null)
    if (!over || !state) return
    const cardId = String(active.id)
    const columnId = columnOf(cardId, state.placement)
    if (!columnId) return

    let ids = state.placement[columnId]
    const overIndex = ids.indexOf(String(over.id))
    if (overIndex !== -1) ids = arrayMove(ids, ids.indexOf(cardId), overIndex)
    const index = ids.indexOf(cardId)
    const afterId = ids[index - 1]
    const beforeId = ids[index + 1]

    const original = cardsById.get(cardId)
    const originalIds = placementFromCache[original?.columnId ?? ''] ?? []
    const originalIndex = originalIds.indexOf(cardId)
    const unchanged =
      original?.columnId === columnId &&
      originalIds[originalIndex - 1] === afterId &&
      originalIds[originalIndex + 1] === beforeId
    if (unchanged) return
    moveCard({ cardId, columnId, afterId, beforeId })
  }

  if (board.isPending) return <p className="text-sm text-muted-foreground">Carregando board…</p>
  if (board.isError)
    return <p className="text-sm text-destructive">{apiErrorMessage(board.error)}</p>

  const { columns } = board.data
  const visibleMobileColumn = mobileColumnId ?? columns[0]?.id
  const activeCard = dragging ? cardsById.get(dragging.cardId) : undefined
  const cardsIn = (columnId: string) =>
    placement[columnId].flatMap((id) => cardsById.get(id) ?? []) as CardSummary[]

  return (
    <>
      {usesSprints && (
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <Select value={scope} onValueChange={(value) => setScope(value as 'sprint' | 'all')}>
            <SelectTrigger size="sm" className="w-48 bg-background" aria-label="Cards exibidos">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sprint">Sprint ativa</SelectItem>
              <SelectItem value="all">Todos os cards</SelectItem>
            </SelectContent>
          </Select>
          {scope === 'sprint' &&
            (activeSprint ? (
              <span className="text-muted-foreground">
                {activeSprint.name} · {formatDay(activeSprint.startDate)} a{' '}
                {formatDay(activeSprint.endDate)}
                {activeSprint.goal && ` · ${activeSprint.goal}`}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Nenhuma sprint em andamento.{' '}
                <Link to={`/p/${project.key}/backlog`} className="underline">
                  Planeje no backlog
                </Link>
                .
              </span>
            ))}
        </div>
      )}
      <div className="mb-3">
        <BoardFilters members={members.data?.members ?? []} tags={tags.data ?? []} />
      </div>
      {/* Phones show one column at a time. */}
      <div className="md:hidden">
        <Select value={visibleMobileColumn} onValueChange={setMobileColumnId}>
          <SelectTrigger className="w-full bg-background" aria-label="Coluna">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {columns.map((column) => (
              <SelectItem key={column.id} value={column.id}>
                {column.name} ({placement[column.id].length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="flex h-[calc(100dvh-14rem)] gap-3 overflow-x-auto pb-2">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              projectId={project.id}
              column={column}
              cards={cardsIn(column.id)}
              lookups={lookups}
              canCreate={!readOnly && can('card:create')}
              canMove={!readOnly && can('card:move')}
              className={`w-full shrink-0 md:w-72 ${
                column.id === visibleMobileColumn ? '' : 'max-md:hidden'
              }`}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard && (
            <div className="w-72 rotate-2 cursor-grabbing">
              <CardFace card={activeCard} lookups={lookups} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* The card drawer (/p/:key/c/:number) opens over the board. */}
      <Outlet context={project} />
    </>
  )
}
