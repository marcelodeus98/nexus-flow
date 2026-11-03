import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/shared/notify/toast'
import { http } from '@/shared/api/http'
import { getSocket } from '@/shared/realtime/socket'

export type NotificationType =
  | 'MENTION'
  | 'ASSIGNED'
  | 'COMMENT'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'TIMER_LONG'
  | 'EXPORT_READY'
  | 'QA_APPROVED'
  | 'QA_REJECTED'

export type NotificationPayload = {
  projectKey?: string
  cardNumber?: number
  cardTitle?: string
  actorName?: string
  excerpt?: string
  dueDate?: string
  hours?: number
  exportId?: string
  fileName?: string
}

export type AppNotification = {
  id: string
  type: NotificationType
  payload: NotificationPayload
  readAt: string | null
  createdAt: string
}

type NotificationPage = { items: AppNotification[]; nextCursor: string | null; unreadCount: number }

export type Preference = { type: NotificationType; inApp: boolean; email: boolean }

const key = ['notifications'] as const

// The socket pushes new ones; polling covers a dropped connection.
export function useNotifications() {
  return useQuery({
    queryKey: key,
    queryFn: () => http<NotificationPage>('/notifications?limit=30'),
    refetchInterval: 60_000,
  })
}

// New notifications arrive on the user's socket room: they go to the top of
// the list and show as a toast.
export function useNotificationStream() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  useEffect(() => {
    const socket = getSocket()
    const onNew = (notification: AppNotification) => {
      queryClient.setQueryData<NotificationPage>(key, (page) =>
        page && !page.items.some((n) => n.id === notification.id)
          ? {
              ...page,
              items: [notification, ...page.items],
              unreadCount: page.unreadCount + 1,
            }
          : page,
      )
      const { title, path } = notificationText(notification)
      toast.action(title, 'Abrir', () => void navigate(path))
    }
    // After a reconnect, catch up on what arrived while offline.
    const onConnect = () => void queryClient.invalidateQueries({ queryKey: key, exact: true })
    socket.on('notification.new', onNew)
    socket.on('connect', onConnect)
    return () => {
      socket.off('notification.new', onNew)
      socket.off('connect', onConnect)
    }
  }, [queryClient, navigate])
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[] | 'all') =>
      http<{ unreadCount: number }>('/notifications/read', {
        method: 'POST',
        body: JSON.stringify(ids === 'all' ? {} : { ids }),
      }),
    onMutate: (ids) =>
      queryClient.setQueryData<NotificationPage>(key, (page) => {
        if (!page) return page
        const now = new Date().toISOString()
        const items = page.items.map((n) =>
          ids === 'all' || ids.includes(n.id) ? { ...n, readAt: n.readAt ?? now } : n,
        )
        return { ...page, items, unreadCount: items.filter((n) => !n.readAt).length }
      }),
    onSuccess: ({ unreadCount }) =>
      queryClient.setQueryData<NotificationPage>(key, (page) =>
        page ? { ...page, unreadCount } : page,
      ),
  })
}

export function usePreferences() {
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => http<Preference[]>('/notifications/preferences'),
  })
}

export function useSetPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (preferences: Preference[]) =>
      http<Preference[]>('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences }),
      }),
    onSuccess: (saved) => queryClient.setQueryData(['notifications', 'preferences'], saved),
  })
}

export const typeLabels: Record<NotificationType, string> = {
  MENTION: 'Menções',
  ASSIGNED: 'Cards atribuídos a mim',
  COMMENT: 'Comentários em cards que sigo',
  DUE_SOON: 'Prazo vencendo amanhã',
  OVERDUE: 'Cards atrasados',
  TIMER_LONG: 'Timer ligado há muito tempo',
  EXPORT_READY: 'Exportação pronta',
  QA_APPROVED: 'Card meu aprovado pelo QA',
  QA_REJECTED: 'Card meu reprovado pelo QA',
}

// What a notification says and where it leads.
export function notificationText(n: AppNotification): { title: string; path: string } {
  const p = n.payload
  const card = p.projectKey && p.cardNumber ? `${p.projectKey}-${p.cardNumber}` : 'um card'
  const cardPath = p.projectKey && p.cardNumber ? `/p/${p.projectKey}/c/${p.cardNumber}` : '/'
  const actor = p.actorName ?? 'Alguém'
  switch (n.type) {
    case 'MENTION':
      return { title: `${actor} mencionou você em ${card}`, path: cardPath }
    case 'ASSIGNED':
      return { title: `${actor} atribuiu ${card} a você`, path: cardPath }
    case 'COMMENT':
      return { title: `${actor} comentou em ${card}`, path: cardPath }
    case 'DUE_SOON':
      return { title: `${card} vence amanhã`, path: cardPath }
    case 'OVERDUE':
      return { title: `${card} está atrasado`, path: cardPath }
    case 'TIMER_LONG':
      return { title: `Seu timer em ${card} está ligado há ${p.hours ?? 8} h`, path: cardPath }
    case 'EXPORT_READY':
      return { title: `Exportação pronta: ${p.fileName ?? ''}`, path: '/exports' }
    case 'QA_APPROVED':
      return { title: `${actor} aprovou ${card}`, path: cardPath }
    case 'QA_REJECTED':
      return { title: `${actor} reprovou ${card}`, path: cardPath }
  }
}
