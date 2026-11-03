import { Badge, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { HelpLink } from '@/features/help/help-link'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { CardSummary } from '@/features/board/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import './qa-queue-page.css'

type QueuedCard = CardSummary & {
  project: { id: string; key: string; name: string }
  columnName: string
  // When the card entered testing this time.
  testingSince: string
}

// Cards waiting in "Em teste" columns and not approved yet, longest waiting
// first, in every project where the user can validate (QA, PO, manager).
export function QaQueuePage() {
  const queue = useQuery({
    queryKey: ['qa', 'queue'],
    queryFn: () => http<QueuedCard[]>('/qa/queue'),
    refetchInterval: 60_000,
  })
  const cards = queue.data ?? []

  return (
    <Stack gap="md">
      <div>
        <Group justify="space-between">
          <Title order={2}>Fila de testes</Title>
          <HelpLink topic="qa" />
        </Group>
        <Text size="sm" c="dimmed">
          Cards nas colunas "Em teste" dos projetos em que você valida, do mais antigo ao mais
          recente.
        </Text>
      </div>
      {queue.isError && (
        <Text size="sm" c="red">
          {apiErrorMessage(queue.error)}
        </Text>
      )}
      <Paper withBorder radius="md">
        {queue.isPending && (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            Carregando…
          </Text>
        )}
        {queue.isSuccess && cards.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            Nada aguardando teste.
          </Text>
        )}
        {cards.length > 0 && (
          <ul className="qa-queue">
            {cards.map((card) => (
              <li key={card.id}>
                <Link to={`/p/${card.project.key}/c/${card.number}`} className="qa-queue__link">
                  <Text span size="xs" c="dimmed" ff="monospace">
                    {card.project.key}-{card.number}
                  </Text>{' '}
                  {card.title}
                </Link>
                <Text size="xs" c="dimmed">
                  {card.project.name} · {card.columnName}
                </Text>
                {card.rejectionCount > 0 && (
                  <Badge size="sm" variant="light" color="orange">
                    voltou {card.rejectionCount}×
                  </Badge>
                )}
                <Text size="xs" c="dimmed" className="qa-queue__since">
                  em teste desde{' '}
                  {new Date(card.testingSince).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </Paper>
    </Stack>
  )
}
