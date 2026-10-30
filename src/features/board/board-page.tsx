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
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import { Group, Select, Stack, Text } from '@mantine/core'
import { toast } from '@/shared/notify/toast'
import { useCan, useProjectMembers } from '@/features/projects/api'
import { useCurrentProject } from '@/features/projects/project-context'
import { formatDay, useSprints } from '@/features/sprints/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { useSessionState } from '@/shared/auth/session-store'
import { boardKeys, useBoard, useBoards, useMoveCard, useTags, type CardSummary } from './api'
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
  const navigate = useNavigate()
  // /p/KEY/b/:boardId, or the default board on /p/KEY.
  const boardId = useParams().boardId ?? project.defaultBoardId
  const boards = useBoards(project.id)
  const board = useBoard(project.id, boardId)
  const tags = useTags(project.id)
  const members = useProjectMembers(project.id)
  const can = useCan(project.key)
  const readOnly = project.status === 'ARCHIVED'
  const moveCard = useMoveCard(project.id, boardKeys.board(project.id, boardId ?? ''), (error) =>
    toast.error(moveErrorMessage(error)),
  )

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
    if (sprintFilter === null || (sprintFilter !== undefined && card.sprintId !== sprintFilter))
      continue
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

  if (board.isPending)
    return (
      <Text size="sm" c="dimmed">
        Carregando board…
      </Text>
    )
  if (board.isError)
    return (
      <Text size="sm" c="red">
        {apiErrorMessage(board.error, { 404: 'Board não encontrado.' })}{' '}
        <Link to={`/p/${project.key}`} className="text-link">
          Abrir o board padrão
        </Link>
      </Text>
    )

  const { columns } = board.data
  // Switching boards keeps the page mounted: fall back to the first column.
  const visibleMobileColumn = columns.some((column) => column.id === mobileColumnId)
    ? mobileColumnId
    : columns[0]?.id
  const boardList = boards.data ?? []
  const activeCard = dragging ? cardsById.get(dragging.cardId) : undefined
  const cardsIn = (columnId: string) =>
    placement[columnId].flatMap((id) => cardsById.get(id) ?? []) as CardSummary[]

  return (
    <>
      <Stack gap="sm" mb="sm">
        {(boardList.length > 1 || usesSprints) && (
          <Group gap="md">
            {boardList.length > 1 && (
              <Select
                size="xs"
                w={220}
                aria-label="Board"
                value={board.data.board.id}
                onChange={(id) =>
                  id &&
                  navigate(
                    boardList.find((b) => b.id === id)?.isDefault
                      ? `/p/${project.key}`
                      : `/p/${project.key}/b/${id}`,
                  )
                }
                allowDeselect={false}
                data={boardList.map((b) => ({
                  value: b.id,
                  label: b.isDefault ? `${b.name} (padrão)` : b.name,
                }))}
              />
            )}
            {usesSprints && (
              <Select
                size="xs"
                w={180}
                aria-label="Cards exibidos"
                value={scope}
                onChange={(value) => value && setScope(value as 'sprint' | 'all')}
                allowDeselect={false}
                data={[
                  { value: 'sprint', label: 'Sprint ativa' },
                  { value: 'all', label: 'Todos os cards' },
                ]}
              />
            )}
            {usesSprints &&
              scope === 'sprint' &&
              (activeSprint ? (
                <Text size="sm" c="dimmed">
                  {activeSprint.name} · {formatDay(activeSprint.startDate)} a{' '}
                  {formatDay(activeSprint.endDate)}
                  {activeSprint.goal && ` · ${activeSprint.goal}`}
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  Nenhuma sprint em andamento.{' '}
                  <Link to={`/p/${project.key}/backlog`} className="text-link">
                    Planeje no backlog
                  </Link>
                  .
                </Text>
              ))}
          </Group>
        )}
        <BoardFilters members={members.data?.members ?? []} tags={tags.data ?? []} />
        {/* Phones show one column at a time. */}
        <Select
          hiddenFrom="sm"
          aria-label="Coluna"
          value={visibleMobileColumn ?? null}
          onChange={(id) => id && setMobileColumnId(id)}
          allowDeselect={false}
          data={columns.map((column) => ({
            value: column.id,
            label: `${column.name} (${placement[column.id].length})`,
          }))}
        />
      </Stack>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="board">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              projectId={project.id}
              column={column}
              cards={cardsIn(column.id)}
              lookups={lookups}
              canCreate={!readOnly && can('card:create')}
              canMove={!readOnly && can('card:move')}
              className={column.id === visibleMobileColumn ? '' : 'board-column--mobile-hidden'}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard && (
            <div className="board-card__overlay">
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
