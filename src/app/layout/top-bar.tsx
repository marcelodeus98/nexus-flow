import { ActionIcon, Avatar, Breadcrumbs, Group, Stack, Text } from '@mantine/core'
import { IconChevronRight, IconMenu2, IconX } from '@tabler/icons-react'
import { NotificationBell } from '@/features/notifications/notification-bell'
import { SearchDialog } from '@/features/search/search-dialog'
import { ApiStatus } from '@/features/system/api-status'
import { TimerWidget } from '@/features/time/timer-widget'
import type { SidebarUser } from './sidebar'
import './top-bar.css'

// White bar over the content, as in Nexa Assets: menu toggle and breadcrumb
// on the left; search, the running timer, notifications and the user on the
// right.
export function TopBar({
  currentLabel,
  user,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  currentLabel: string
  user: SidebarUser
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}) {
  return (
    <Group component="header" className="topbar" justify="space-between" wrap="nowrap">
      <Group gap="sm" wrap="nowrap" className="topbar__left">
        <ActionIcon
          variant="subtle"
          c="gray.6"
          aria-label={sidebarCollapsed ? 'Abrir menu' : 'Fechar menu'}
          onClick={onToggleSidebar}
        >
          {sidebarCollapsed ? (
            <IconMenu2 size={18} stroke={1.6} />
          ) : (
            <IconX size={18} stroke={1.6} />
          )}
        </ActionIcon>
        <Breadcrumbs
          className="topbar__breadcrumbs"
          separator={<IconChevronRight size={14} className="topbar__breadcrumb-separator" />}
        >
          <Text className="topbar__breadcrumb-root">Nexa Flow</Text>
          <Text className="topbar__breadcrumb-current">{currentLabel}</Text>
        </Breadcrumbs>
      </Group>

      <Group gap="md" wrap="nowrap">
        <SearchDialog />
        <TimerWidget />
        <ApiStatus />
        <NotificationBell />
        <Group gap="sm" wrap="nowrap" className="topbar__profile">
          <Stack gap={0} align="flex-end" className="topbar__profile-text">
            <Text size="sm" fw={600} c="dark">
              {user.name}
            </Text>
            <Text size="xs" c="dimmed">
              {user.role}
            </Text>
          </Stack>
          <Avatar radius="xl" color="brand.9" variant="filled">
            {user.initials}
          </Avatar>
        </Group>
      </Group>
    </Group>
  )
}
