import { Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import type { ReactNode } from 'react'

// "Are you sure?" before something hard to undo (Mantine modals).
export function confirmDanger({
  title,
  message,
  confirmLabel = 'Excluir',
  onConfirm,
}: {
  title: string
  message: ReactNode
  confirmLabel?: string
  onConfirm: () => void
}) {
  modals.openConfirmModal({
    title,
    children: (
      <Text size="sm" c="dimmed">
        {message}
      </Text>
    ),
    labels: { confirm: confirmLabel, cancel: 'Cancelar' },
    confirmProps: { color: 'red' },
    onConfirm,
  })
}
