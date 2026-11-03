import { describe, expect, it } from 'vitest'
import { parseDuration, planEntry } from './manual-entry'

describe('parseDuration', () => {
  it.each([
    ['1h30', 90],
    ['1:30', 90],
    ['1,5', 90],
    ['1.5', 90],
    ['90m', 90],
    ['90 min', 90],
    ['2h', 120],
    ['2', 120],
    ['45', 45],
    ['0:20', 20],
  ])('reads %s as %i minutes', (text, minutes) => {
    expect(parseDuration(text)).toBe(minutes)
  })

  it('rejects what it cannot read', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('uma hora')).toBeNull()
  })
})

describe('planEntry', () => {
  const now = new Date('2026-10-30T10:00:00')

  it('ends right now when today has no start time', () => {
    const plan = planEntry({ day: '2026-10-30', start: '', duration: '2h' }, now)
    expect(plan).toMatchObject({ ok: true, minutes: 120 })
    if (plan.ok) expect(plan.endedAt.getTime()).toBe(now.getTime())
  })

  it('explains when the entry would end after now', () => {
    const plan = planEntry({ day: '2026-10-30', start: '09:00', duration: '2h' }, now)
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.reason).toMatch(/terminaria às 11:00.*Comece até 08:00/)
  })

  it('starts a past day at 09:00 by default', () => {
    const plan = planEntry({ day: '2026-10-29', start: '', duration: '8h' }, now)
    expect(plan.ok && plan.startedAt.getHours()).toBe(9)
  })

  it('refuses the future and more than 24 hours', () => {
    expect(planEntry({ day: '2026-10-31', start: '', duration: '1h' }, now).ok).toBe(false)
    expect(planEntry({ day: '2026-10-29', start: '', duration: '25h' }, now).ok).toBe(false)
  })
})
