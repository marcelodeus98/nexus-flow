import {
  ActionIcon,
  Anchor,
  Box,
  Group,
  Indicator,
  Popover,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core'
import { IconBell, IconSettings } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  notificationText,
  useMarkRead,
  useNotifications,
  useNotificationStream,
  type AppNotification,
} from './api'
import './notification-bell.css'

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
    <Popover opened={open} onChange={setOpen} position="bottom-end" width={380} shadow="md">
      <Popover.Target>
        <Indicator
          disabled={unread === 0}
          label={unread > 9 ? '9+' : unread}
          size={16}
          color="red"
          offset={4}
        >
          <ActionIcon
            variant="subtle"
            c="gray.6"
            aria-label={unread ? `Notificações (${unread} não lidas)` : 'Notificações'}
            onClick={() => setOpen((o) => !o)}
          >
            <IconBell size={18} stroke={1.6} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Group justify="space-between" px="sm" py="xs" className="notification-bell__header">
          <Text size="sm" fw={600}>
            Notificações
          </Text>
          <Group gap={4}>
            {unread > 0 && (
              <Anchor component="button" size="xs" onClick={() => markRead.mutate('all')}>
                Marcar todas como lidas
              </Anchor>
            )}
            <ActionIcon
              component={Link}
              to="/settings/notifications"
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Preferências"
              onClick={() => setOpen(false)}
            >
              <IconSettings size={14} />
            </ActionIcon>
          </Group>
        </Group>
        <ScrollArea.Autosize mah={384}>
          {notifications.data?.items.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              Nada por aqui ainda.
            </Text>
          )}
          {notifications.data?.items.map((notification) => {
            const { title } = notificationText(notification)
            return (
              <UnstyledButton
                key={notification.id}
                className="notification-bell__item"
                onClick={() => openNotification(notification)}
              >
                <Group gap="xs" wrap="nowrap" align="flex-start">
                  <Box
                    className="notification-bell__dot"
                    data-unread={notification.readAt ? undefined : true}
                    aria-label={notification.readAt ? undefined : 'Não lida'}
                  />
                  <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      size="sm"
                      fw={notification.readAt ? 400 : 600}
                      c={notification.readAt ? 'dimmed' : undefined}
                    >
                      {title}
                    </Text>
                    {notification.payload.cardTitle && (
                      <Text size="xs" c="dimmed" truncate>
                        {notification.payload.cardTitle}
                      </Text>
                    )}
                    {notification.payload.excerpt && (
                      <Text size="xs" c="dimmed" truncate>
                        “{notification.payload.excerpt}”
                      </Text>
                    )}
                  </Stack>
                  <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {timeAgo(notification.createdAt)}
                  </Text>
                </Group>
              </UnstyledButton>
            )
          })}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  )
}
