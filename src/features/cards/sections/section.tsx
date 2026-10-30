import { Group, Stack, Title } from '@mantine/core'
import type { ReactNode } from 'react'

// A titled block of the drawer (description, checklist, comments...).
export function Section({
  title,
  aside,
  children,
}: {
  title: ReactNode
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <Stack gap="xs" component="section">
      <Group gap="xs">
        <Title order={5}>{title}</Title>
        {aside}
      </Group>
      {children}
    </Stack>
  )
}
