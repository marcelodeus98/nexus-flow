import { Checkbox, Paper, Stack, Table, Text, Title } from '@mantine/core'
import { apiErrorMessage } from '@/shared/api/errors'
import { toast } from '@/shared/notify/toast'
import { typeLabels, usePreferences, useSetPreferences, type Preference } from './api'

// Each kind of notification, in the app and/or by e-mail. Saved on change.
export function NotificationPreferencesPage() {
  const preferences = usePreferences()
  const save = useSetPreferences()

  function toggle(preference: Preference, channel: 'inApp' | 'email', value: boolean) {
    save.mutate([{ ...preference, [channel]: value }], {
      onError: (error) => toast.error(apiErrorMessage(error)),
    })
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Notificações</Title>
        <Text size="sm" c="dimmed">
          Escolha o que você recebe no Nexa Flow e o que também chega por e-mail.
        </Text>
      </div>
      <Paper withBorder radius="md">
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Quando</Table.Th>
              <Table.Th w={96} ta="center">
                No app
              </Table.Th>
              <Table.Th w={96} ta="center">
                E-mail
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {preferences.data?.map((preference) => (
              <Table.Tr key={preference.type}>
                <Table.Td>{typeLabels[preference.type]}</Table.Td>
                {(['inApp', 'email'] as const).map((channel) => (
                  <Table.Td key={channel}>
                    <Checkbox
                      mx="auto"
                      w="fit-content"
                      checked={preference[channel]}
                      disabled={save.isPending}
                      aria-label={`${typeLabels[preference.type]}: ${channel === 'inApp' ? 'no app' : 'e-mail'}`}
                      onChange={(e) => toggle(preference, channel, e.currentTarget.checked)}
                    />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  )
}
