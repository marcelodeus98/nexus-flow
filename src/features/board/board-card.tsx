import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconBug, IconCalendar, IconListCheck, IconRotate } from '@tabler/icons-react'
import { severityLabels } from '@/features/qa/bug-severity'
import { memo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { EstimateView } from '@/features/projects/api'
import type { CardSummary, Tag } from './api'
import { estimateLabel, initials } from './card-format'
import './board.css'

export type CardLookups = {
  projectKey: string
  estimateView: EstimateView
  tagsById: Map<string, Tag>
  membersById: Map<string, { name: string }>
  // YYYY-MM-DD, fixed when the board renders, for "overdue".
  today: string
}

// What a card looks like on the board (also used in the drag overlay).
export function CardFace({ card, lookups }: { card: CardSummary; lookups: CardLookups }) {
  const due = card.dueDate ? new Date(card.dueDate) : null
  const overdue = card.dueDate !== null && card.dueDate.slice(0, 10) < lookups.today
  const estimate = estimateLabel(card, lookups.estimateView)
  const tags = card.tagIds.flatMap((id) => lookups.tagsById.get(id) ?? [])

  // Plain elements and CSS (board.css): a board can hold 500 of these.
  return (
    <div className={`board-card${card.type === 'BUG' ? ' board-card--bug' : ''}`}>
      <div className="board-card__top">
        <span className="board-card__key">
          {card.type === 'BUG' && <IconBug size={12} aria-label="Bug" />}
          {lookups.projectKey}-{card.number}
        </span>
        <span className="board-card__flags">
          {card.bugSeverity && (
            <span className={`board-card__severity board-card__severity--${card.bugSeverity}`}>
              {severityLabels[card.bugSeverity]}
            </span>
          )}
          {card.qaStatus && (
            <span className={`board-card__qa board-card__qa--${card.qaStatus}`}>
              {card.qaStatus === 'APPROVED' ? 'Aprovado' : 'Reprovado'}
            </span>
          )}
          {(card.priority === 'HIGH' || card.priority === 'URGENT') && (
            <span className={`board-card__priority board-card__priority--${card.priority}`}>
              {card.priority === 'URGENT' ? 'Urgente' : 'Alta'}
            </span>
          )}
        </span>
      </div>
      <p className="board-card__title">{card.title}</p>
      {tags.length > 0 && (
        <div className="board-card__tags">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="board-card__tag"
              style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <div className="board-card__meta">
        {estimate && <span>{estimate}</span>}
        {card.rejectionCount > 0 && (
          <span
            className="board-card__meta-item board-card__meta-item--rework"
            title={`Voltou do QA ${card.rejectionCount} ${card.rejectionCount === 1 ? 'vez' : 'vezes'}`}
          >
            <IconRotate size={12} aria-hidden />
            {card.rejectionCount}
          </span>
        )}
        {card.checklistTotal > 0 && (
          <span
            className={`board-card__meta-item${
              card.checklistDone === card.checklistTotal ? ' board-card__meta-item--done' : ''
            }`}
            title="Checklist"
          >
            <IconListCheck size={12} aria-hidden />
            {card.checklistDone}/{card.checklistTotal}
          </span>
        )}
        {due && (
          <span
            className={`board-card__meta-item${overdue ? ' board-card__meta-item--overdue' : ''}`}
          >
            <IconCalendar size={12} aria-hidden />
            {due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
          </span>
        )}
        <span className="board-card__avatars">
          {card.assigneeIds.slice(0, 3).map((id) => {
            const name = lookups.membersById.get(id)?.name ?? '?'
            return (
              <span key={id} title={name} className="board-card__avatar">
                {initials(name)}
              </span>
            )
          })}
        </span>
      </div>
    </div>
  )
}

// Re-renders only when this card's version changes, so a socket event for one
// card does not repaint the whole board.
export const SortableCard = memo(
  function SortableCard({
    card,
    lookups,
    draggable,
  }: {
    card: CardSummary
    lookups: CardLookups
    draggable: boolean
  }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: card.id,
      data: { type: 'card' },
      disabled: !draggable,
    })
    return (
      <li
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        // Off-screen cards skip layout and paint (500-card boards); the
        // intrinsic size keeps the column's scroll height and dnd-kit's
        // measurements right.
        className={`board-card__slot${isDragging ? ' board-card__slot--dragging' : ''}`}
        {...attributes}
        {...listeners}
      >
        <CardLink to={`c/${card.number}`}>
          <CardFace card={card} lookups={lookups} />
        </CardLink>
      </li>
    )
  },
  (prev, next) =>
    prev.card.id === next.card.id &&
    prev.card.version === next.card.version &&
    prev.card.columnId === next.card.columnId &&
    prev.card.qaStatus === next.card.qaStatus &&
    prev.draggable === next.draggable &&
    prev.lookups === next.lookups,
)

function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="board-card__link" draggable={false}>
      {children}
    </Link>
  )
}
