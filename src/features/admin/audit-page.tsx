import { Stack, Text } from '@mantine/core'
import { AuditLog } from '@/features/audit/audit-log'

export function AdminAuditPage() {
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Tudo o que foi feito no sistema, do mais recente ao mais antigo. O registro não pode ser
        alterado nem apagado.
      </Text>
      <AuditLog source="/audit" />
    </Stack>
  )
}
