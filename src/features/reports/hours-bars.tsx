import { formatHours, type TimeReport } from './api'
import './hours-bars.css'

// Hours per person/card/sprint/day as horizontal bars: one series, one hue,
// bars thin and anchored left, the value at the tip in text colour. The
// labels and values are the bars' own table, so nothing hides behind hover.
export function HoursBars({ report }: { report: TimeReport }) {
  const max = Math.max(...report.rows.map((row) => row.seconds), 1)
  if (report.rows.length === 0) {
    return <p className="hours-bars__empty">Nenhuma hora registrada no período.</p>
  }
  return (
    <ul className="hours-bars" aria-label="Horas registradas">
      {report.rows.map((row) => (
        <li key={row.key}>
          <span className="hours-bars__label" title={row.label}>
            {row.label}
          </span>
          <span className="hours-bars__track">
            <span
              className="hours-bars__bar"
              style={{ width: `${(row.seconds / max) * 85}%` }}
              aria-hidden
            />
            <span className="hours-bars__value">{formatHours(row.seconds)}</span>
            <span className="hours-bars__entries">
              {row.entries} {row.entries === 1 ? 'lançamento' : 'lançamentos'}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
