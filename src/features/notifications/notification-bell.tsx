import { BellIcon, SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import {
  notificationText,
  useMarkRead,
  useNotifications,
  useNotificationStream,
  type AppNotification,
} from './api'

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function NotificationBell() {
  useNotificationStream()
  const notifications = useNotifications()
  const markRead = useMarkRead()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const unread = notifications.data?.unreadCount ?? 0

  function openNotification(notification: AppNotification) {
    if (!notification.readAt) markRead.mutate([notification.id])
    setOpen(false)
    void navigate(notificationText(notification).path)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={unread ? `Notificações (${unread} não lidas)` : 'Notificações'}
        >
          <BellIcon />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notificações</span>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <Button variant="link" size="xs" onClick={() => markRead.mutate('all')}>
                Marcar todas como lidas
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" asChild aria-label="Preferências">
              <Link to="/settings/notifications" onClick={() => setOpen(false)}>
                <SettingsIcon />
              </Link>
            </Button>
          </div>
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {notifications.data?.items.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nada por aqui ainda.
            </li>
          )}
          {notifications.data?.items.map((notification) => {
            const { title } = notificationText(notification)
            return (
              <li key={notification.id}>
                <button
                  type="button"
                  className="flex w-full gap-2 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                  onClick={() => openNotification(notification)}
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      notification.readAt ? 'bg-transparent' : 'bg-primary'
                    }`}
                    aria-label={notification.readAt ? undefined : 'Não lida'}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={notification.readAt ? 'text-muted-foreground' : 'font-medium'}>
                      {title}
                    </span>
                    {notification.payload.cardTitle && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {notification.payload.cardTitle}
                      </span>
                    )}
                    {notification.payload.excerpt && (
                      <span className="block truncate text-xs text-muted-foreground">
                        “{notification.payload.excerpt}”
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(notification.createdAt)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
