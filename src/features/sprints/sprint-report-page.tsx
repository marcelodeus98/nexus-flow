import { ArrowLeftIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useCurrentProject } from '@/features/projects/project-context'
import { apiErrorMessage } from '@/shared/api/errors'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { formatDay, statusLabels, useBurndown, useSprint, type SprintOutcome } from './api'
import { BurndownChart, type BurndownUnit } from './burndown-chart'

const outcomeLabels: Record<SprintOutcome, string> = {
  COMPLETED: 'Concluído',
  CARRIED_OVER: 'Passou para a próxima',
  RETURNED_TO_BACKLOG: 'Voltou ao backlog',
  REMOVED: 'Retirado',
}

export function SprintReportPage() {
  const project = useCurrentProject()
  const { sprintId = '' } = useParams()
  const sprint = useSprint(sprintId)
  const burndown = useBurndown(sprintId)
  const [unit, setUnit] = useState<BurndownUnit>(
    project.defaultEstimateView === 'HOURS' ? 'hours' : 'points',
  )

  if (sprint.isPending) return <p className="text-sm text-muted-foreground">Carregando…</p>
  if (sprint.isError)
    return <p className="text-sm text-destructive">{apiErrorMessage(sprint.error)}</p>

  const s = sprint.data
  const committed = s.history.filter((h) => !h.addedLate)
  const late = s.history.filter((h) => h.addedLate)
  const completed = s.history.filter((h) => h.outcome === 'COMPLETED')
  const spent = s.history.reduce((sum, h) => sum + (h.timeSpentMinutes ?? 0), 0)
  const points = (list: typeof s.history) =>
    list.reduce((sum, h) => sum + (h.pointsAtEnd ?? h.pointsAtStart ?? 0), 0)

  const figures = [
    {
      label: 'Compromisso inicial',
      value: `${committed.length} cards`,
      detail: `${points(committed)} pts`,
    },
    {
      label: 'Entrou depois do início',
      value: `${late.length} cards`,
      detail: `${points(late)} pts`,
    },
    {
      label: s.status === 'CLOSED' ? 'Concluído' : 'Concluído até agora',
      value:
        s.status === 'CLOSED' ? `${completed.length} cards` : `${s.totals.completedPoints} pts`,
      detail:
        s.status === 'CLOSED'
          ? `${points(completed)} pts`
          : `${s.totals.remainingPoints} pts restantes`,
    },
    {
      label: 'Tempo registrado',
      value: s.status === 'CLOSED' ? `${Math.round((spent / 60) * 10) / 10} h` : '—',
      detail: s.status === 'CLOSED' ? 'nos cards da sprint' : 'calculado no encerramento',
    },
  ]

  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-1">
        <Button variant="link" size="sm" className="px-0" asChild>
          <Link to={`/p/${project.key}/backlog`}>
            <ArrowLeftIcon /> Backlog
          </Link>
        </Button>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {s.name}
          <Badge variant={s.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {statusLabels[s.status]}
          </Badge>
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatDay(s.startDate)} a {formatDay(s.endDate)}
          {s.goal && ` · ${s.goal}`}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label} className="rounded-lg border bg-background p-3">
            <dt className="text-xs text-muted-foreground">{figure.label}</dt>
            <dd className="text-xl font-semibold">{figure.value}</dd>
            <dd className="text-xs text-muted-foreground">{figure.detail}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3 rounded-xl border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Burndown</h3>
          <div className="flex rounded-md border p-0.5" role="group" aria-label="Unidade">
            {(['points', 'hours'] as const).map((value) => (
              <Button
                key={value}
                size="xs"
                variant={unit === value ? 'secondary' : 'ghost'}
                aria-pressed={unit === value}
                onClick={() => setUnit(value)}
              >
                {value === 'points' ? 'Pontos' : 'Horas'}
              </Button>
            ))}
          </div>
        </div>
        {burndown.data ? (
          <BurndownChart days={burndown.data.days} scope={burndown.data.scope} unit={unit} />
        ) : (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Cards da sprint</h3>
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead className="text-right">Pontos (início → fim)</TableHead>
                <TableHead className="text-right">Tempo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.history.map((entry) => (
                <TableRow key={entry.card.id}>
                  <TableCell className="max-w-72">
                    <Link
                      to={`/p/${project.key}/c/${entry.card.number}`}
                      className={`hover:underline ${entry.card.deleted ? 'line-through' : ''}`}
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {project.key}-{entry.card.number}
                      </span>{' '}
                      {entry.card.title}
                    </Link>
                    {entry.addedLate && (
                      <Badge variant="outline" className="ml-2">
                        entrou depois
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.outcome ? outcomeLabels[entry.outcome] : 'Em andamento'}
                    {entry.columnAtClose && (
                      <span className="block text-xs text-muted-foreground">
                        {entry.columnAtClose}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.pointsAtStart ?? '—'} → {entry.pointsAtEnd ?? '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.timeSpentMinutes !== null
                      ? `${Math.round((entry.timeSpentMinutes / 60) * 10) / 10} h`
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
