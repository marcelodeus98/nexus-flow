import { describe, expect, it } from 'vitest'
import type { CardSummary } from './api'
import { matchesFilter, type BoardFilter } from './board-filter'

const card = (overrides: Partial<CardSummary> = {}): CardSummary => ({
  id: 'c1',
  number: 42,
  title: 'Exportar relatório de horas',
  priority: 'MEDIUM',
  storyPoints: null,
  estimateMinutes: null,
  dueDate: null,
  columnId: 'col',
  rank: 'a0',
  sprintId: null,
  parentId: null,
  version: 1,
  updatedAt: '2026-10-29T00:00:00.000Z',
  assigneeIds: [],
  tagIds: [],
  departments: [],
  checklistTotal: 0,
  checklistDone: 0,
  ...overrides,
})

const none: BoardFilter = {
  q: '',
  assignee: 'any',
  tag: 'any',
  priority: 'any',
  department: 'any',
  due: 'any',
}
const context = { userId: 'me', today: '2026-10-29' }
const matches = (c: CardSummary, filter: Partial<BoardFilter>) =>
  matchesFilter(c, { ...none, ...filter }, context)

describe('board filter', () => {
  it('matches text in the title or the card number', () => {
    expect(matches(card(), { q: 'relatório' })).toBe(true)
    expect(matches(card(), { q: '42' })).toBe(true)
    expect(matches(card(), { q: 'NEXA-42' })).toBe(true)
    expect(matches(card(), { q: 'NEXA-4' })).toBe(false)
    expect(matches(card(), { q: 'sprint' })).toBe(false)
  })

  it('filters by assignee, including "me" and "nobody"', () => {
    expect(matches(card({ assigneeIds: ['me'] }), { assignee: 'me' })).toBe(true)
    expect(matches(card({ assigneeIds: ['ana'] }), { assignee: 'me' })).toBe(false)
    expect(matches(card(), { assignee: 'none' })).toBe(true)
    expect(matches(card({ assigneeIds: ['ana'] }), { assignee: 'ana' })).toBe(true)
  })

  it('filters by due date: overdue, next 7 days, none', () => {
    const due = (day: string) => card({ dueDate: `${day}T00:00:00.000Z` })
    expect(matches(due('2026-10-28'), { due: 'overdue' })).toBe(true)
    expect(matches(due('2026-10-29'), { due: 'overdue' })).toBe(false)
    expect(matches(due('2026-11-05'), { due: 'week' })).toBe(true)
    expect(matches(due('2026-11-06'), { due: 'week' })).toBe(false)
    expect(matches(card(), { due: 'none' })).toBe(true)
  })

  it('combines filters', () => {
    const c = card({ priority: 'URGENT', tagIds: ['bug'], assigneeIds: ['me'] })
    expect(matches(c, { priority: 'URGENT', tag: 'bug', assignee: 'me' })).toBe(true)
    expect(matches(c, { priority: 'URGENT', tag: 'feature' })).toBe(false)
  })
})
