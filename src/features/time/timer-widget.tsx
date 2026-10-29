import { PauseIcon, PlayIcon, SquareIcon } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/shared/api/errors'
import { Button } from '@/shared/ui/button'
import { formatDuration, useElapsed, useTimer, useTimerActions } from './api'

// Header timer: the running card with its elapsed time, or the paused card
// with a resume button. Nothing when neither exists.
export function TimerWidget() {
  const timer = useTimer()
  const { start, pause, stop } = useTimerActions()
  const running = timer.data?.running
  const paused = timer.data?.paused
  const elapsed = useElapsed(running?.startedAt)
  const onError = (error: unknown) => toast.error(apiErrorMessage(error))

  const card = running?.card ?? paused?.card
  if (!card) return null

  return (
    <div
      className={`flex items-center gap-1 rounded-full border py-0.5 pr-0.5 pl-3 text-sm ${
        running ? 'border-emerald-600/40 bg-emerald-600/10' : 'bg-muted'
      }`}
      role="timer"
      aria-label={running ? 'Timer em andamento' : 'Timer pausado'}
    >
      <Link
        to={`/p/${card.projectKey}/c/${card.number}`}
        className="max-w-48 truncate hover:underline"
        title={card.title}
      >
        <span className="font-mono text-xs text-muted-foreground">
          {card.projectKey}-{card.number}
        </span>{' '}
        {card.title}
      </Link>
      {running && (
        <span className="ml-1 font-mono tabular-nums">{formatDuration(elapsed, true)}</span>
      )}
      {running ? (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Pausar timer"
          disabled={pause.isPending}
          onClick={() => pause.mutate(undefined, { onError })}
        >
          <PauseIcon />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Retomar timer"
          disabled={start.isPending}
          onClick={() => start.mutate(card.id, { onError })}
        >
          <PlayIcon />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Parar timer"
        disabled={stop.isPending}
        onClick={() => stop.mutate(undefined, { onError })}
      >
        <SquareIcon />
      </Button>
    </div>
  )
}
