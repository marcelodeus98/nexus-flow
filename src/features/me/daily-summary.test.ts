import { describe, expect, it } from 'vitest'
import type { ActivityCard, Daily, DailyCard } from './api'
import { activityNote, dailyText, dayName, hoursText } from './daily-summary'

const card = (over: Partial<DailyCard>): DailyCard => ({
  id: 'c1',
  key: 'NEXA-1',
  number: 1,
  title: 'Login',
  type: 'TASK',
  priority: 'MEDIUM',
  dueDate: null,
  qaStatus: null,
  storyPoints: null,
  project: { key: 'NEXA', name: 'Nexa' },
  column: 'Em andamento',
  category: 'IN_PROGRESS',
  sprint: null,
  severity: null,
  ...over,
})

const activity = (over: Partial<ActivityCard>): ActivityCard => ({
  ...card(over),
  seconds: 0,
  moves: [],
  reviews: [],
  completed: false,
  ...over,
})

const empty = { seconds: 0, completed: [], worked: [] }

describe('daily summary', () => {
  it('formats days and durations', () => {
    expect(dayName('2026-11-10')).toBe('ter, 10/11')
    expect(hoursText(45 * 60)).toBe('45 min')
    expect(hoursText(7200)).toBe('2 h')
    expect(hoursText(5400)).toBe('1h30')
  })

  it('describes what was done on a card', () => {
    expect(
      activityNote(
        activity({
          seconds: 5400,
          moves: [
            { from: 'A fazer', to: 'Em andamento' },
            { from: 'Em andamento', to: 'Em teste' },
          ],
          reviews: ['REJECTED'],
        }),
      ),
    ).toBe('1h30 · A fazer → Em teste · reprovou')
  })

  it('writes yesterday, today and blockers as text', () => {
    const late = card({ id: 'c2', key: 'NEXA-2', title: 'Relatório', dueDate: '2026-11-10' })
    const daily: Daily = {
      date: '2026-11-11',
      previousDate: '2026-11-10',
      previous: {
        seconds: 7200,
        completed: [activity({ id: 'c3', key: 'NEXA-3', title: 'Cadastro', completed: true })],
        worked: [activity({ seconds: 7200, moves: [{ from: 'A fazer', to: 'Em andamento' }] })],
      },
      today: { ...empty, running: null },
      open: { total: 2, inProgress: [card({}), late], todo: [], backlog: [] },
      attention: { overdue: [late], dueToday: [], rejected: [late], openBugs: [] },
    }

    expect(dailyText(daily, 'Ana')).toBe(
      [
        'Daily de Ana — qua, 11/11',
        '',
        'Ontem (ter, 10/11):',
        '- Concluí NEXA-3 Cadastro',
        '- Trabalhei em NEXA-1 Login (2 h · A fazer → Em andamento)',
        '  Total: 2 h',
        '',
        'Hoje:',
        '- NEXA-1 Login (Em andamento)',
        '- NEXA-2 Relatório (Em andamento)',
        '',
        'Impedimentos / atenção:',
        '- NEXA-2 Relatório: atrasado (prazo ter, 10/11), reprovado pelo QA',
      ].join('\n'),
    )
  })

  it('says so when there is nothing', () => {
    const daily: Daily = {
      date: '2026-11-16',
      previousDate: '2026-11-13',
      previous: empty,
      today: { ...empty, running: null },
      open: { total: 0, inProgress: [], todo: [], backlog: [] },
      attention: { overdue: [], dueToday: [], rejected: [], openBugs: [] },
    }
    const text = dailyText(daily, 'Ana')
    expect(text).toContain('Ontem (sex, 13/11):\n- Nada registrado')
    expect(text).toContain('Hoje:\n- Nada em andamento')
    expect(text).toContain('Impedimentos / atenção:\n- Nenhum')
  })
})
