import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { SprintTotals } from './api'
import { formatDay } from './api'

export type BurndownUnit = 'points' | 'hours'

type Day = { date: string; value: SprintTotals | null }

const HEIGHT = 260
const PAD = { top: 16, right: 48, bottom: 28, left: 40 }

const remainingOf = (value: SprintTotals, unit: BurndownUnit) =>
  unit === 'points' ? value.remainingPoints : value.remainingMinutes / 60

const fmt = (n: number, unit: BurndownUnit) =>
  `${Math.round(n * 10) / 10}${unit === 'points' ? ' pts' : ' h'}`

// Clean axis maximum and ticks: 0, step, 2·step… with step in 1/2/5×10^k.
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1]
  const rough = max / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? rough
  const ticks: number[] = []
  for (let t = 0; t <= max + step * 0.001; t += step) ticks.push(Math.round(t * 1000) / 1000)
  if (ticks.at(-1)! < max) ticks.push(ticks.at(-1)! + step)
  return ticks
}

// Burndown: what is left of the sprint, from the committed scope at the
// start to the end of each day, against the ideal straight line down to zero
// on the last day. One y-axis; days after today are on the axis without data.
export function BurndownChart({
  days: sprintDays,
  scope,
  unit,
}: {
  days: Day[]
  scope: { points: number; minutes: number }
  unit: BurndownUnit
}) {
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const element = container.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  if (!sprintDays.some((day) => day.value)) {
    return (
      <p className="text-sm text-muted-foreground">O burndown aparece quando a sprint começa.</p>
    )
  }

  // Point 0 is the start (committed scope); point i+1 is the end of day i.
  const start = unit === 'points' ? scope.points : scope.minutes / 60
  const days = [{ date: '', value: null }, ...sprintDays]
  const labels = ['Início', ...sprintDays.map((day) => formatDay(day.date))]
  const actual = [
    start,
    ...sprintDays.map((day) => (day.value ? remainingOf(day.value, unit) : null)),
  ]
  const ideal = days.map((_, i) => start * (1 - i / (days.length - 1)))
  const ticks = niceTicks(Math.max(start, ...actual.map((v) => v ?? 0)))
  const yMax = ticks.at(-1)!

  const plotW = Math.max(width - PAD.left - PAD.right, 50)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (i / (days.length - 1)) * plotW
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH

  const actualPoints = actual.flatMap((v, i) => (v === null ? [] : [`${x(i)},${y(v)}`]))
  const lastIndex = actual.findLastIndex((v) => v !== null)
  const lastValue = actual[lastIndex]
  // Enough x labels to orient, never crowded: about one per 70px.
  const labelEvery = Math.max(1, Math.ceil(days.length / Math.max(plotW / 70, 2)))

  function indexAt(clientX: number) {
    const box = container.current?.getBoundingClientRect()
    if (!box) return null
    const ratio = (clientX - box.left - PAD.left) / plotW
    return Math.min(days.length - 1, Math.max(0, Math.round(ratio * (days.length - 1))))
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const current = active ?? lastIndex
    const next = current + (event.key === 'ArrowRight' ? 1 : -1)
    setActive(Math.min(days.length - 1, Math.max(0, next)))
  }

  const hovered = active !== null ? days[active] : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-[var(--series-1)]" aria-hidden /> Restante
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-4 bg-[var(--chart-reference)]" aria-hidden /> Ideal
        </span>
      </div>
      <div
        ref={container}
        className="relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        tabIndex={0}
        role="img"
        aria-label={`Burndown em ${unit === 'points' ? 'pontos' : 'horas'}: começou com ${fmt(start, unit)}${
          lastValue !== null && lastValue !== undefined ? `, restam ${fmt(lastValue, unit)}` : ''
        }. Use as setas para percorrer os dias.`}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={HEIGHT} className="block overflow-visible">
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {tick}
              </text>
            </g>
          ))}
          {days.map((_day, i) =>
            i % labelEvery === 0 || i === days.length - 1 ? (
              <text
                key={labels[i]}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {labels[i]}
              </text>
            ) : null,
          )}

          <line
            x1={x(0)}
            y1={y(start)}
            x2={x(days.length - 1)}
            y2={y(0)}
            stroke="var(--chart-reference)"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <polyline
            points={actualPoints.join(' ')}
            fill="none"
            stroke="var(--series-1)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {lastValue !== null && lastValue !== undefined && (
            <>
              <circle
                cx={x(lastIndex)}
                cy={y(lastValue)}
                r={4}
                fill="var(--series-1)"
                stroke="var(--background)"
                strokeWidth={2}
              />
              <text
                x={x(lastIndex) + 8}
                y={y(lastValue)}
                dy="0.32em"
                className="fill-foreground text-xs font-medium"
              >
                {fmt(lastValue, unit)}
              </text>
            </>
          )}

          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
            />
          )}
          {/* Hit area: the whole plot, so the crosshair finds the nearest day. */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={(event: PointerEvent) => setActive(indexAt(event.clientX))}
            onPointerLeave={() => setActive(null)}
          />
        </svg>

        {hovered && active !== null && (
          <div
            className="pointer-events-none absolute top-2 rounded-md border bg-popover px-3 py-2 text-xs shadow-md"
            style={
              x(active) > width / 2 ? { right: width - x(active) + 8 } : { left: x(active) + 8 }
            }
          >
            <p className="mb-1 font-medium">{labels[active]}</p>
            <p className="flex items-center gap-2">
              <span className="h-0.5 w-3 rounded bg-[var(--series-1)]" aria-hidden />
              <span className="font-semibold tabular-nums">
                {actual[active] === null ? '—' : fmt(actual[active]!, unit)}
              </span>
              <span className="text-muted-foreground">restante</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="h-px w-3 bg-[var(--chart-reference)]" aria-hidden />
              <span className="font-semibold tabular-nums">{fmt(ideal[active], unit)}</span>
              <span className="text-muted-foreground">ideal</span>
            </p>
          </div>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Ver como tabela</summary>
        <table className="mt-2 w-full max-w-md text-left tabular-nums">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Dia</th>
              <th className="py-1 font-medium">Restante</th>
              <th className="py-1 font-medium">Ideal</th>
            </tr>
          </thead>
          <tbody>
            {days.map((_day, i) => (
              <tr key={labels[i]} className="border-t">
                <td className="py-1">{labels[i]}</td>
                <td className="py-1">{actual[i] === null ? '—' : fmt(actual[i]!, unit)}</td>
                <td className="py-1">{fmt(ideal[i], unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
