import { formatHours, type TimeReport } from './api'

// Hours per person/card/sprint/day as horizontal bars: one series, one hue,
// bars thin and anchored left, the value at the tip in text colour. The
// labels and values are the bars' own table, so nothing hides behind hover.
export function HoursBars({ report }: { report: TimeReport }) {
  const max = Math.max(...report.rows.map((row) => row.seconds), 1)
  if (report.rows.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">Nenhuma hora registrada no período.</p>
  }
  return (
    <ul className="space-y-2" aria-label="Horas registradas">
      {report.rows.map((row) => (
        <li
          key={row.key}
          className="grid grid-cols-[minmax(8rem,14rem)_1fr] items-center gap-3 text-sm"
        >
          <span className="truncate" title={row.label}>
            {row.label}
          </span>
          <span className="flex items-center gap-2">
            <span
              className="h-4 min-w-1 rounded-r-[4px] bg-[var(--series-1)]"
              style={{ width: `${(row.seconds / max) * 85}%` }}
              aria-hidden
            />
            <span className="shrink-0 font-medium tabular-nums">{formatHours(row.seconds)}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {row.entries} {row.entries === 1 ? 'lançamento' : 'lançamentos'}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
