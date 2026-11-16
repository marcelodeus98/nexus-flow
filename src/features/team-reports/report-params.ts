import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

// Filters live in the URL, so a report can be shared as a link. Default
// period: this month so far (fixed when the page opens).
export function useReportParams() {
  const [params, setParams] = useSearchParams()
  const [today] = useState(() => new Date().toLocaleDateString('en-CA'))
  const set = (name: string, value: string | undefined) =>
    setParams(
      () => {
        const next = new URLSearchParams(window.location.search)
        if (value) next.set(name, value)
        else next.delete(name)
        return next
      },
      { replace: true },
    )
  return {
    from: params.get('from') ?? `${today.slice(0, 8)}01`,
    to: params.get('to') ?? today,
    get: (name: string) => params.get(name) ?? undefined,
    set,
  }
}

export const pct = (value: number | null) =>
  value === null ? '—' : `${value.toLocaleString('pt-BR')}%`
export const num = (value: number | null, suffix = '') =>
  value === null ? '—' : `${value.toLocaleString('pt-BR')}${suffix}`
// Positive: took longer than estimated.
export const signedPct = (value: number | null) =>
  value === null ? '—' : `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR')}%`
export const minutesAsHours = (minutes: number) =>
  `${(Math.round((minutes / 60) * 10) / 10).toLocaleString('pt-BR')} h`
export const dayLabel = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`

// Days with logged time, as rows for HoursBars.
export const dayRows = (days: { day: string; seconds: number }[]) =>
  days
    .filter((d) => d.seconds > 0)
    .map((d) => ({ key: d.day, label: dayLabel(d.day), seconds: d.seconds, entries: 0 }))
