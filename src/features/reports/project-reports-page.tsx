import { DownloadIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useCan } from '@/features/projects/api'
import { useCurrentProject } from '@/features/projects/project-context'
import { useSprints } from '@/features/sprints/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import {
  formatHours,
  useEstimateVsActual,
  useRequestExport,
  useTimeReport,
  type GroupBy,
} from './api'
import { HoursBars } from './hours-bars'

const groupLabels: Record<GroupBy, string> = {
  user: 'Pessoa',
  card: 'Card',
  sprint: 'Sprint',
  day: 'Dia',
}

const ALL = 'all'

// Filters live in the URL, so a report can be shared as a link.
export function ProjectReportsPage() {
  const project = useCurrentProject()
  const can = useCan(project.key)
  const seesEveryone = can('reports:view')
  const sprints = useSprints(project.id)
  const [params, setParams] = useSearchParams()
  // Default range: this month so far (fixed when the page opens).
  const [today] = useState(() => new Date().toLocaleDateString('en-CA'))
  const from = params.get('from') ?? `${today.slice(0, 8)}01`
  const to = params.get('to') ?? today
  const groupBy = (params.get('groupBy') as GroupBy | null) ?? 'user'
  const sprintId = params.get('sprint') ?? undefined
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

  const time = useTimeReport(project.id, { from, to, groupBy, sprintId })
  const estimate = useEstimateVsActual(project.id, sprintId, seesEveryone)
  const requestExport = useRequestExport(project.id)
  const [lastExport, setLastExport] = useState<string>()

  function exportFile(kind: 'TIME_ENTRIES' | 'ESTIMATE_VS_ACTUAL', format: 'CSV' | 'XLSX') {
    requestExport.mutate(
      { kind, format, from, to, sprintId },
      {
        onSuccess: (item) => {
          setLastExport(item.id)
          toast.success('Exportação pedida. Avisamos quando ficar pronta.')
        },
        onError: (error) =>
          toast.error(
            apiErrorMessage(error, { 503: 'O armazenamento de arquivos não está configurado.' }),
          ),
      },
    )
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
        <div className="space-y-1">
          <Label htmlFor="from">De</Label>
          <Input
            id="from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => set('from', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">Até</Label>
          <Input
            id="to"
            type="date"
            value={to}
            min={from}
            onChange={(e) => set('to', e.target.value)}
          />
        </div>
        {project.methodology !== 'KANBAN' && (
          <div className="space-y-1">
            <Label>Sprint</Label>
            <Select
              value={sprintId ?? ALL}
              onValueChange={(v) => set('sprint', v === ALL ? undefined : v)}
            >
              <SelectTrigger className="w-44" aria-label="Sprint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {sprints.data?.map((sprint) => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={requestExport.isPending}
            onClick={() => exportFile('TIME_ENTRIES', 'XLSX')}
          >
            <DownloadIcon /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={requestExport.isPending}
            onClick={() => exportFile('TIME_ENTRIES', 'CSV')}
          >
            <DownloadIcon /> CSV
          </Button>
        </div>
      </div>
      {lastExport && (
        <p className="text-sm text-muted-foreground">
          A exportação aparece em{' '}
          <Link to="/exports" className="underline">
            Minhas exportações
          </Link>{' '}
          quando estiver pronta.
        </p>
      )}

      <section className="space-y-3 rounded-xl border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Horas registradas</h3>
            <p className="text-sm text-muted-foreground">
              {time.data
                ? `${formatHours(time.data.totalSeconds)} no período${
                    time.data.filter.onlyOwn ? ' (somente as suas)' : ''
                  }`
                : 'Carregando…'}
            </p>
          </div>
          <div className="flex rounded-md border p-0.5" role="group" aria-label="Agrupar por">
            {(Object.keys(groupLabels) as GroupBy[]).map((value) => (
              <Button
                key={value}
                size="xs"
                variant={groupBy === value ? 'secondary' : 'ghost'}
                aria-pressed={groupBy === value}
                onClick={() => set('groupBy', value)}
              >
                {groupLabels[value]}
              </Button>
            ))}
          </div>
        </div>
        {time.isError && <p className="text-sm text-destructive">{apiErrorMessage(time.error)}</p>}
        {time.data && <HoursBars report={time.data} />}
      </section>

      {seesEveryone && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">Estimado vs real</h3>
              {estimate.data && (
                <p className="text-sm text-muted-foreground">
                  {formatHours(estimate.data.totals.estimateMinutes * 60)} estimadas,{' '}
                  {formatHours(estimate.data.totals.actualMinutesOnEstimated * 60)} gastas nesses
                  cards. Os maiores estouros aparecem primeiro.
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={requestExport.isPending}
              onClick={() => exportFile('ESTIMATE_VS_ACTUAL', 'XLSX')}
            >
              <DownloadIcon /> Excel
            </Button>
          </div>
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>Coluna</TableHead>
                  <TableHead className="text-right">Estimado</TableHead>
                  <TableHead className="text-right">Real</TableHead>
                  <TableHead className="text-right">Desvio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimate.data?.rows.map((row) => (
                  <TableRow key={row.cardId}>
                    <TableCell className="max-w-80 truncate">
                      <Link to={`/p/${project.key}/c/${row.number}`} className="hover:underline">
                        <span className="font-mono text-xs text-muted-foreground">
                          {project.key}-{row.number}
                        </span>{' '}
                        {row.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.column}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.estimateMinutes === null ? '—' : formatHours(row.estimateMinutes * 60)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatHours(row.actualMinutes * 60)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        (row.deviationPct ?? 0) > 20 ? 'font-medium text-destructive' : ''
                      }`}
                    >
                      {row.deviationPct === null
                        ? '—'
                        : `${row.deviationPct > 0 ? '+' : ''}${row.deviationPct}%`}
                    </TableCell>
                  </TableRow>
                ))}
                {estimate.data?.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      Nenhum card com estimativa em horas ou tempo registrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  )
}
