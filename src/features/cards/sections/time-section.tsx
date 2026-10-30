import { ActionIcon, Button, Group, Paper, SimpleGrid, Text, TextInput } from '@mantine/core'
import { IconPlayerPause, IconPlayerPlay, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { toast } from '@/shared/notify/toast'
import {
  formatDuration,
  useCardTime,
  useElapsed,
  useTimeEntryMutations,
  useTimer,
  useTimerActions,
} from '@/features/time/api'
import { apiErrorMessage } from '@/shared/api/errors'
import type { CardDetail } from '../api'
import { Section } from './section'

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
    <Section
      title="Tempo"
      aside={
        <>
          <Text size="sm" c="dimmed">
            {formatDuration(total)} registrado
            {estimateSec !== null && ` de ${formatDuration(estimateSec)} estimado`}
          </Text>
          {canLog && (
            <Group gap="xs" ml="auto">
              {runningHere ? (
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconPlayerPause size={14} />}
                  disabled={pause.isPending}
                  onClick={() => pause.mutate(undefined, { onError })}
                >
                  Pausar ({formatDuration(elapsed, true)})
                </Button>
              ) : (
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconPlayerPlay size={14} />}
                  disabled={start.isPending}
                  onClick={() => start.mutate(card.id, { onError })}
                >
                  Iniciar timer
                </Button>
              )}
              <Button size="xs" variant="subtle" onClick={() => setAdding(!adding)}>
                Lançar manualmente
              </Button>
            </Group>
          )}
        </>
      }
    >
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
        <ul className="card-drawer__list">
          {finished.slice(0, 20).map((entry) => (
            <li key={entry.id}>
              <Text span size="sm" fw={600} w={64}>
                {formatDuration(entry.durationSec ?? 0)}
              </Text>
              <Text span size="sm" c="dimmed" truncate style={{ flex: 1, minWidth: 0 }}>
                {entry.user.name} ·{' '}
                {new Date(entry.startedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                })}
                {entry.source === 'MANUAL' && ' · manual'}
                {entry.note && ` · ${entry.note}`}
              </Text>
              {entry.userId === userId && canLog && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label="Excluir lançamento"
                  onClick={() => remove.mutate(entry.id, { onError })}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
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
    <Paper withBorder radius="md" p="sm">
      <form
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
        <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="xs">
          <TextInput
            size="xs"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Dia"
            required
          />
          <TextInput
            size="xs"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-label="Início"
            required
          />
          <TextInput
            size="xs"
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            aria-label="Horas"
            placeholder="Horas"
            required
          />
          <TextInput
            size="xs"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (opcional)"
            aria-label="Nota"
            maxLength={500}
          />
          <Button type="submit" size="xs" loading={pending}>
            Lançar
          </Button>
        </SimpleGrid>
      </form>
    </Paper>
  )
}
