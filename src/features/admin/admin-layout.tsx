import { Stack, Title } from '@mantine/core'
import { Outlet, useLocation } from 'react-router-dom'

const titles: Record<string, string> = {
  users: 'Usuários',
  departments: 'Departamentos',
  teams: 'Times',
  tags: 'Tags globais',
  audit: 'Auditoria',
}

// The admin screens are reached from the sidebar; this only titles them.
export function AdminLayout() {
  const section = useLocation().pathname.split('/')[2] ?? ''
  return (
    <Stack gap="lg">
      <Title order={2}>{titles[section] ?? 'Administração'}</Title>
      <Outlet />
    </Stack>
  )
}
