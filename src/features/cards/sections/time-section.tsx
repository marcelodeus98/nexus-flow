import { PauseIcon, PlayIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  formatDuration,
  useCardTime,
  useElapsed,
  useTimeEntryMutations,
  useTimer,
  useTimerActions,
} from '@/features/time/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import type { CardDetail } from '../api'

// Timer for this card, total logged, the entries and a manual entry form.
export function TimeSection({
  card,
  canLog,
  userId,
}: {
  card: CardDetail
  canLog: boolean
  userId: string
}) {
  const time = useCardTime(card.id)
  const timer = useTimer()
  const { start, pause } = useTimerActions()
  const { create, remove } = useTimeEntryMutations(card.id)
  const runningHere = timer.data?.running?.card.id === card.id
  const elapsed = useElapsed(runningHere ? timer.data?.running?.startedAt : undefined)
  const [adding, setAdding] = useState(false)
  const onError = (error: unknown) => toast.error(apiErrorMessage(error))

  const total = (time.data?.totalSec ?? 0) + elapsed
  const estimateSec = card.estimateMinutes !== null ? card.estimateMinutes * 60 : null
  const finished = (time.data?.entries ?? []).filter((entry) => entry.endedAt)

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Tempo</h3>
        <span className="text-sm text-muted-foreground">
          {formatDuration(total)} registrado
          {estimateSec !== null && ` de ${formatDuration(estimateSec)} estimado`}
        </span>
        {canLog && (
          <div className="ml-auto flex gap-2">
            {runningHere ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pause.isPending}
                onClick={() => pause.mutate(undefined, { onError })}
              >
                <PauseIcon /> Pausar ({formatDuration(elapsed, true)})
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={start.isPending}
                onClick={() => start.mutate(card.id, { onError })}
              >
                <PlayIcon /> Iniciar timer
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>
              Lançar manualmente
            </Button>
          </div>
        )}
      </div>

      {adding && (
        <ManualEntryForm
          pending={create.isPending}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: () => setAdding(false),
              onError: (error) =>
                toast.error(
                  apiErrorMessage(error, { 400: 'Confira a data e a duração (máximo 24 h).' }),
                ),
            })
          }
        />
      )}

      {finished.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">
          {finished.slice(0, 20).map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="w-16 font-medium tabular-nums">
                {formatDuration(entry.durationSec ?? 0)}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {entry.user.name} ·{' '}
                {new Date(entry.startedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                })}
                {entry.source === 'MANUAL' && ' · manual'}
                {entry.note && ` · ${entry.note}`}
              </span>
              {entry.userId === userId && canLog && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Excluir lançamento"
                  onClick={() => remove.mutate(entry.id, { onError })}
                >
                  <Trash2Icon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ManualEntryForm({
  pending,
  onSubmit,
}: {
  pending: boolean
  onSubmit: (input: { startedAt: string; durationMinutes: number; note?: string }) => void
}) {
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [start, setStart] = useState('09:00')
  const [hours, setHours] = useState('1')
  const [note, setNote] = useState('')

  return (
    <form
      className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-[auto_auto_6rem_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        const durationMinutes = Math.round(Number(hours.replace(',', '.')) * 60)
        if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return
        onSubmit({
          // Local date and time as typed, sent with the browser's offset.
          startedAt: new Date(`${date}T${start}`).toISOString(),
          durationMinutes,
          note: note.trim() || undefined,
        })
      }}
    >
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Dia"
        required
      />
      <Input
        type="time"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        aria-label="Início"
        required
      />
      <Input
        inputMode="decimal"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        aria-label="Horas"
        placeholder="Horas"
        required
      />
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional)"
        aria-label="Nota"
        maxLength={500}
      />
      <Button type="submit" size="sm" disabled={pending}>
        Lançar
      </Button>
    </form>
  )
}
