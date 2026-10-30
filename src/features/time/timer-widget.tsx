import { ActionIcon, Anchor, Group, Text } from '@mantine/core'
import { IconPlayerPause, IconPlayerPlay, IconPlayerStop } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '@/shared/api/errors'
import { toast } from '@/shared/notify/toast'
import { formatDuration, useElapsed, useTimer, useTimerActions } from './api'
import './timer-widget.css'

// Top bar timer: the running card with its elapsed time, or the paused card
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
    <Group
      gap={4}
      wrap="nowrap"
      className={`timer-widget${running ? ' timer-widget--running' : ''}`}
      role="timer"
      aria-label={running ? 'Timer em andamento' : 'Timer pausado'}
    >
      <Anchor
        component={Link}
        to={`/p/${card.projectKey}/c/${card.number}`}
        className="timer-widget__card"
        title={card.title}
        c="inherit"
      >
        <Text span ff="monospace" size="xs" c="dimmed">
          {card.projectKey}-{card.number}
        </Text>{' '}
        {card.title}
      </Anchor>
      {running && (
        <Text span ff="monospace" size="sm" ml={4}>
          {formatDuration(elapsed, true)}
        </Text>
      )}
      {running ? (
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label="Pausar timer"
          disabled={pause.isPending}
          onClick={() => pause.mutate(undefined, { onError })}
        >
          <IconPlayerPause size={16} />
        </ActionIcon>
      ) : (
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label="Retomar timer"
          disabled={start.isPending}
          onClick={() => start.mutate(card.id, { onError })}
        >
          <IconPlayerPlay size={16} />
        </ActionIcon>
      )}
      <ActionIcon
        variant="subtle"
        size="sm"
        color="gray"
        aria-label="Parar timer"
        disabled={stop.isPending}
        onClick={() => stop.mutate(undefined, { onError })}
      >
        <IconPlayerStop size={16} />
      </ActionIcon>
    </Group>
  )
}
