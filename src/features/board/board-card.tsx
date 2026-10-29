import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarIcon, ListChecksIcon } from 'lucide-react'
import { memo, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { EstimateView } from '@/features/projects/api'
import type { CardSummary, Tag } from './api'
import { estimateLabel, initials } from './card-format'

export type CardLookups = {
  projectKey: string
  estimateView: EstimateView
  tagsById: Map<string, Tag>
  membersById: Map<string, { name: string }>
  // YYYY-MM-DD, fixed when the board renders, for "overdue".
  today: string
}

const priorityStyles = {
  HIGH: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  URGENT: 'bg-red-500/15 text-red-700 dark:text-red-300',
} as const

// What a card looks like on the board (also used in the drag overlay).
export function CardFace({ card, lookups }: { card: CardSummary; lookups: CardLookups }) {
  const due = card.dueDate ? new Date(card.dueDate) : null
  const overdue = card.dueDate !== null && card.dueDate.slice(0, 10) < lookups.today
  const estimate = estimateLabel(card, lookups.estimateView)
  const tags = card.tagIds.flatMap((id) => lookups.tagsById.get(id) ?? [])

  return (
    <div className="space-y-2 rounded-lg border bg-background p-3 text-sm shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {lookups.projectKey}-{card.number}
        </span>
        {(card.priority === 'HIGH' || card.priority === 'URGENT') && (
          <span className={`rounded px-1.5 text-xs font-medium ${priorityStyles[card.priority]}`}>
            {card.priority === 'URGENT' ? 'Urgente' : 'Alta'}
          </span>
        )}
      </div>
      <p className="leading-snug font-medium break-words">{card.title}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded px-1.5 text-xs"
              style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {estimate && <span>{estimate}</span>}
        {card.checklistTotal > 0 && (
          <span
            className={`inline-flex items-center gap-1 ${
              card.checklistDone === card.checklistTotal ? 'text-emerald-700' : ''
            }`}
            title="Checklist"
          >
            <ListChecksIcon className="size-3" aria-hidden />
            {card.checklistDone}/{card.checklistTotal}
          </span>
        )}
        {due && (
          <span className={`inline-flex items-center gap-1 ${overdue ? 'text-destructive' : ''}`}>
            <CalendarIcon className="size-3" aria-hidden />
            {due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
          </span>
        )}
        <span className="ml-auto flex -space-x-1.5">
          {card.assigneeIds.slice(0, 3).map((id) => {
            const name = lookups.membersById.get(id)?.name ?? '?'
            return (
              <span
                key={id}
                title={name}
                className="flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-foreground"
              >
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
        className={`[contain-intrinsic-size:auto_96px] [content-visibility:auto] ${
          isDragging ? 'opacity-40' : ''
        }`}
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
    prev.draggable === next.draggable &&
    prev.lookups === next.lookups,
)

function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="block rounded-lg focus-visible:outline-2" draggable={false}>
      {children}
    </Link>
  )
}
