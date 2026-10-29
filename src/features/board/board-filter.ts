import { useSearchParams } from 'react-router'
import type { CardSummary } from './api'
import { isoDay } from './card-format'

const ANY = 'any'

export type BoardFilter = {
  q: string
  assignee: string // ANY | 'me' | 'none' | userId
  tag: string
  priority: string
  department: string
  due: string // ANY | 'overdue' | 'week' | 'none'
}

const names: (keyof BoardFilter)[] = ['q', 'assignee', 'tag', 'priority', 'department', 'due']

// Filters live in the URL (?q=&assignee=…), so a filtered board is a link.
export function useBoardFilter() {
  const [params, setParams] = useSearchParams()
  const filter = Object.fromEntries(
    names.map((name) => [name, params.get(name) ?? (name === 'q' ? '' : ANY)]),
  ) as BoardFilter
  const set = (name: keyof BoardFilter, value: string) =>
    setParams(
      () => {
        // From the live URL: React Router's `current` can still be the
        // previous render's (two filter changes in a row would lose one).
        const next = new URLSearchParams(window.location.search)
        if (value && value !== ANY) next.set(name, value)
        else next.delete(name)
        return next
      },
      { replace: true },
    )
  const clear = () =>
    setParams(
      () => {
        const next = new URLSearchParams(window.location.search)
        for (const name of names) next.delete(name)
        return next
      },
      { replace: true },
    )
  const active = names.some((name) => filter[name] !== (name === 'q' ? '' : ANY))
  return { filter, set, clear, active }
}

// The predicate the board applies to each card. Text matches the title or
// the card number ("123" or "NEXA-123").
export function matchesFilter(
  card: CardSummary,
  filter: BoardFilter,
  context: { userId: string; today: string },
) {
  const q = filter.q.trim().toLowerCase()
  if (q) {
    const number = q.replace(/^[a-z][a-z0-9]*-/, '')
    const byNumber = /^\d+$/.test(number) && String(card.number) === number
    if (!byNumber && !card.title.toLowerCase().includes(q)) return false
  }
  if (filter.assignee !== ANY) {
    if (filter.assignee === 'none' && card.assigneeIds.length > 0) return false
    if (filter.assignee === 'me' && !card.assigneeIds.includes(context.userId)) return false
    if (!['none', 'me'].includes(filter.assignee) && !card.assigneeIds.includes(filter.assignee)) {
      return false
    }
  }
  if (filter.tag !== ANY && !card.tagIds.includes(filter.tag)) return false
  if (filter.priority !== ANY && card.priority !== filter.priority) return false
  if (
    filter.department !== ANY &&
    !card.departments.some((d) => d.departmentId === filter.department)
  ) {
    return false
  }
  if (filter.due !== ANY) {
    const due = card.dueDate?.slice(0, 10) ?? null
    if (filter.due === 'none' && due !== null) return false
    if (filter.due === 'overdue' && (due === null || due >= context.today)) return false
    if (filter.due === 'week') {
      const inAWeek = isoDay(new Date(Date.parse(`${context.today}T00:00:00Z`) + 7 * 86_400_000))
      if (due === null || due < context.today || due > inAWeek) return false
    }
  }
  return true
}
