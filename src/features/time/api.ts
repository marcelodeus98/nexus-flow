import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { cardKeys } from '@/features/cards/api'
import { http } from '@/shared/api/http'
import { getSocket } from '@/shared/realtime/socket'

export type TimerCard = { id: string; number: number; title: string; projectKey: string }

export type TimerState = {
  running: { entryId: string; startedAt: string; card: TimerCard } | null
  paused: { pausedAt: string; card: TimerCard } | null
}

export type TimeEntry = {
  id: string
  cardId: string
  userId: string
  startedAt: string
  endedAt: string | null
  durationSec: number | null
  source: 'TIMER' | 'MANUAL'
  note: string | null
  user: { id: string; name: string }
}

const timerKey = ['timer'] as const

// The user's timer, kept in sync across tabs by the `timer.changed` event
// the API sends to the user's own room.
export function useTimer() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const socket = getSocket()
    const onChanged = (state: TimerState) => {
      queryClient.setQueryData(timerKey, state)
      // A closed entry shows up in that card's time list.
      void queryClient.invalidateQueries({ queryKey: ['cards'], predicate: isTimeQuery })
    }
    socket.on('timer.changed', onChanged)
    return () => {
      socket.off('timer.changed', onChanged)
    }
  }, [queryClient])
  return useQuery({ queryKey: timerKey, queryFn: () => http<TimerState>('/timer/current') })
}

const isTimeQuery = (query: { queryKey: readonly unknown[] }) => query.queryKey[2] === 'time'

export function useTimerActions() {
  const queryClient = useQueryClient()
  const onSuccess = (state: TimerState) => {
    queryClient.setQueryData(timerKey, state)
    return queryClient.invalidateQueries({ queryKey: ['cards'], predicate: isTimeQuery })
  }
  const start = useMutation({
    mutationFn: (cardId: string) =>
      http<TimerState>(`/cards/${cardId}/timer/start`, { method: 'POST' }),
    onSuccess,
  })
  const pause = useMutation({
    mutationFn: () => http<TimerState>('/timer/pause', { method: 'POST' }),
    onSuccess,
  })
  const stop = useMutation({
    mutationFn: () => http<TimerState>('/timer/stop', { method: 'POST' }),
    onSuccess,
  })
  return { start, pause, stop }
}

// Seconds since `startedAt`, ticking once a second. Always derived from the
// server's start time, so tabs and reloads agree.
export function useElapsed(startedAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!startedAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [startedAt])
  return startedAt ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)) : 0
}

export function formatDuration(totalSec: number, withSeconds = false) {
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (withSeconds) return `${hours}:${pad(minutes)}:${pad(seconds)}`
  return hours > 0 ? `${hours}h${pad(minutes)}` : `${minutes} min`
}

export function useCardTime(cardId: string) {
  return useQuery({
    queryKey: cardKeys.time(cardId),
    queryFn: () =>
      http<{ entries: TimeEntry[]; totalSec: number }>(`/cards/${cardId}/time-entries`),
  })
}

export function useTimeEntryMutations(cardId: string) {
  const queryClient = useQueryClient()
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: cardKeys.time(cardId) })
  const create = useMutation({
    mutationFn: (input: { startedAt: string; durationMinutes: number; note?: string }) =>
      http<TimeEntry>(`/cards/${cardId}/time-entries`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess,
  })
  const update = useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string
      durationMinutes?: number
      note?: string | null
    }) => http<TimeEntry>(`/time-entries/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess,
  })
  const remove = useMutation({
    mutationFn: (id: string) => http<void>(`/time-entries/${id}`, { method: 'DELETE' }),
    onSuccess,
  })
  return { create, update, remove }
}
