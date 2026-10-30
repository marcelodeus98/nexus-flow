import { Anchor } from '@mantine/core'
import { notifications } from '@mantine/notifications'

// Avisos rápidos no canto da tela (Mantine Notifications, como no Assets).
export const toast = {
  success: (message: string) => notifications.show({ message, color: 'brand' }),
  error: (message: string) => notifications.show({ message, color: 'red' }),
  // A notice with a link to act on it ("Abrir").
  action: (title: string, label: string, onClick: () => void) => {
    const id = notifications.show({
      title,
      message: (
        <Anchor
          component="button"
          size="sm"
          onClick={() => {
            notifications.hide(id)
            onClick()
          }}
        >
          {label}
        </Anchor>
      ),
    })
  },
}
