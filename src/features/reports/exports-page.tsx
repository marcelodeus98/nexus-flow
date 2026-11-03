import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { IconDownload } from '@tabler/icons-react'
import { useState } from 'react'
import { apiErrorMessage } from '@/shared/api/errors'
import { toast } from '@/shared/notify/toast'
import { downloadExport, useExports, type ExportItem, type ExportStatus } from './api'

const statusLabels: Record<ExportStatus, string> = {
  PENDING: 'Na fila',
  RUNNING: 'Gerando',
  DONE: 'Pronta',
  FAILED: 'Falhou',
}

const kindLabels: Record<ExportItem['kind'], string> = {
  TIME_ENTRIES: 'Horas registradas',
  ESTIMATE_VS_ACTUAL: 'Estimado vs real',
  QUALITY: 'Qualidade',
}

const statusColors: Record<ExportStatus, string> = {
  PENDING: 'gray',
  RUNNING: 'blue',
  DONE: 'brand',
  FAILED: 'red',
}

// The user's own exports: produced in the background, kept for 24 hours.
export function ExportsPage() {
  const exports = useExports()
  // Fixed when the page opens; enough to tell expired files apart.
  const [now] = useState(() => Date.now())
  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Minhas exportações</Title>
        <Text size="sm" c="dimmed">
          Os arquivos ficam disponíveis por 24 horas. Peça novas na aba Relatórios de cada projeto.
        </Text>
      </div>
      <Paper withBorder radius="md">
        {exports.data?.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            Nenhuma exportação ainda.
          </Text>
        )}
        {exports.data?.map((item, index) => {
          const expired = item.expiresAt !== null && Date.parse(item.expiresAt) < now
          return (
            <Group
              key={item.id}
              gap="md"
              px="md"
              py="sm"
              style={index > 0 ? { borderTop: '1px solid var(--nexa-border)' } : undefined}
            >
              <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>
                  {item.fileName ?? kindLabels[item.kind]}
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(item.createdAt).toLocaleString('pt-BR')} · {item.format}
                  {item.rowCount !== null && ` · ${item.rowCount} linhas`}
                </Text>
              </Stack>
              <Badge color={expired ? 'gray' : statusColors[item.status]} variant="light">
                {expired ? 'Expirada' : statusLabels[item.status]}
              </Badge>
              {item.status === 'DONE' && !expired && (
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconDownload size={14} />}
                  onClick={() =>
                    downloadExport(item.id).catch((error: unknown) =>
                      toast.error(apiErrorMessage(error)),
                    )
                  }
                >
                  Baixar
                </Button>
              )}
            </Group>
          )
        })}
      </Paper>
    </Stack>
  )
}
