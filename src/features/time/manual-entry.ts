// The rules of a manual time entry, kept out of the form so they can be
// tested: it records time already worked, so it ends no later than now and
// lasts from 1 minute to 24 hours (the API checks the same).

export const MAX_MINUTES = 24 * 60

// "1h30", "1:30", "1,5", "1.5", "90m", "90 min", "2h", "45" (minutes when
// there is no unit and it is above 24, hours otherwise). Null when unreadable.
export function parseDuration(text: string): number | null {
  const value = text.trim().toLowerCase().replace(/\s+/g, '')
  if (!value) return null
  let match = /^(\d{1,2}):(\d{1,2})$/.exec(value)
  if (match) return Number(match[1]) * 60 + Number(match[2])
  match = /^(\d{1,2})h(?:(\d{1,2})(?:m|min)?)?$/.exec(value)
  if (match) return Number(match[1]) * 60 + Number(match[2] ?? 0)
  match = /^(\d{1,4})(?:m|min)$/.exec(value)
  if (match) return Number(match[1])
  match = /^(\d{1,2})[.,](\d{1,2})$/.exec(value)
  if (match) return Math.round(Number(`${match[1]}.${match[2]}`) * 60)
  match = /^(\d{1,4})$/.exec(value)
  if (match) {
    const number = Number(match[1])
    return number <= 24 ? number * 60 : number
  }
  return null
}

export type ManualEntryPlan =
  { ok: true; startedAt: Date; endedAt: Date; minutes: number } | { ok: false; reason: string }

// What the form will record. Without a start time, a day in the past starts
// at 09:00 and today ends right now.
export function planEntry(
  input: { day: string; start: string; duration: string },
  now: Date = new Date(),
): ManualEntryPlan {
  const minutes = parseDuration(input.duration)
  if (minutes === null) {
    return { ok: false, reason: 'Informe a duração, por exemplo 1h30, 1:30 ou 90m.' }
  }
  if (minutes < 1) return { ok: false, reason: 'A duração precisa ser de pelo menos 1 minuto.' }
  if (minutes > MAX_MINUTES) {
    return { ok: false, reason: 'Um lançamento vai até 24 h. Lance dias diferentes separadamente.' }
  }
  if (!input.day) return { ok: false, reason: 'Informe o dia.' }
  const today = now.toLocaleDateString('en-CA')
  if (input.day > today) {
    return { ok: false, reason: 'Só dá para lançar tempo já trabalhado (hoje ou antes).' }
  }

  let startedAt: Date
  if (input.start) {
    startedAt = new Date(`${input.day}T${input.start}`)
  } else if (input.day === today) {
    startedAt = new Date(now.getTime() - minutes * 60_000)
  } else {
    startedAt = new Date(`${input.day}T09:00`)
  }
  const endedAt = new Date(startedAt.getTime() + minutes * 60_000)
  if (endedAt > now) {
    const latest = new Date(now.getTime() - minutes * 60_000)
    return {
      ok: false,
      reason: `Com essa duração, o lançamento terminaria às ${time(endedAt)}, depois de agora. Comece até ${time(latest)} ou deixe o início em branco.`,
    }
  }
  return { ok: true, startedAt, endedAt, minutes }
}

export const time = (date: Date) =>
  date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h === 0 ? `${m} min` : m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}
