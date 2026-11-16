import type { ActivityCard, Daily, DailyCard } from './api'

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

// "ter, 10/11" for a YYYY-MM-DD day.
export function dayName(day: string): string {
  const weekday = WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()]
  return `${weekday}, ${day.slice(8, 10)}/${day.slice(5, 7)}`
}

export function hoursText(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h} h`
}

const label = (card: DailyCard) => `${card.key} ${card.title}`

// What the person did with a card, in a few words.
export function activityNote(card: ActivityCard): string {
  const parts: string[] = []
  if (card.seconds > 0) parts.push(hoursText(card.seconds))
  const lastMove = card.moves.at(-1)
  if (lastMove) parts.push(`${card.moves[0].from} → ${lastMove.to}`)
  const approved = card.reviews.filter((r) => r === 'APPROVED').length
  const rejected = card.reviews.length - approved
  if (approved) parts.push(approved > 1 ? `aprovou ${approved}x` : 'aprovou')
  if (rejected) parts.push(rejected > 1 ? `reprovou ${rejected}x` : 'reprovou')
  return parts.join(' · ')
}

// The cards planned for today: what is in progress plus what is due today.
export function todayPlan(daily: Daily): DailyCard[] {
  const seen = new Set<string>()
  return [...daily.open.inProgress, ...daily.attention.dueToday].filter((card) =>
    seen.has(card.id) ? false : (seen.add(card.id), true),
  )
}

// Everything that may block the person or that the team should know.
export function attentionNotes(daily: Daily): { card: DailyCard; note: string }[] {
  const notes = new Map<string, { card: DailyCard; reasons: string[] }>()
  const add = (cards: DailyCard[], reason: (card: DailyCard) => string) => {
    for (const card of cards) {
      const entry = notes.get(card.id) ?? { card, reasons: [] }
      entry.reasons.push(reason(card))
      notes.set(card.id, entry)
    }
  }
  add(daily.attention.overdue, (c) => `atrasado (prazo ${dayName(c.dueDate!)})`)
  add(daily.attention.rejected, () => 'reprovado pelo QA')
  add(daily.attention.openBugs, (c) =>
    c.severity ? `bug ${severityWord[c.severity]} aberto` : 'bug aberto',
  )
  return [...notes.values()].map(({ card, reasons }) => ({ card, note: reasons.join(', ') }))
}

const severityWord = { CRITICAL: 'crítico', HIGH: 'alto', MEDIUM: 'médio', LOW: 'baixo' }

// The daily as plain text, ready to paste in a chat or read aloud.
export function dailyText(daily: Daily, name: string): string {
  const lines: string[] = [`Daily de ${name} — ${dayName(daily.date)}`, '']

  lines.push(`Ontem (${dayName(daily.previousDate)}):`)
  const before = [
    ...daily.previous.completed.map((c) => `- Concluí ${label(c)}`),
    ...daily.previous.worked.map((c) => {
      const note = activityNote(c)
      return `- Trabalhei em ${label(c)}${note ? ` (${note})` : ''}`
    }),
  ]
  lines.push(...(before.length ? before : ['- Nada registrado']))
  if (daily.previous.seconds > 0) lines.push(`  Total: ${hoursText(daily.previous.seconds)}`)

  lines.push('', 'Hoje:')
  const plan = todayPlan(daily).map((c) => {
    const due = c.dueDate === daily.date ? ', vence hoje' : ''
    return `- ${label(c)} (${c.column}${due})`
  })
  lines.push(...(plan.length ? plan : ['- Nada em andamento']))

  const notes = attentionNotes(daily)
  lines.push('', 'Impedimentos / atenção:')
  lines.push(
    ...(notes.length ? notes.map(({ card, note }) => `- ${label(card)}: ${note}`) : ['- Nenhum']),
  )
  return lines.join('\n')
}
