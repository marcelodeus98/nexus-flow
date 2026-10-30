import { Badge, Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core'
import { IconCheck, IconChecks, IconX } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { upsertCard, type CardSummary } from '@/features/board/api'
import { moveErrorMessage } from '@/features/board/move-errors'
import { http } from '@/shared/api/http'
import { toast } from '@/shared/notify/toast'
import { cardKeys, type CardDetail } from '../api'
import { Section } from './section'

type Review = {
  id: string
  outcome: 'APPROVED' | 'REJECTED'
  reason: string | null
  createdAt: string
  reviewer: { id: string; name: string } | null
}

type ReviewInput = { outcome: Review['outcome']; reason?: string; complete?: boolean }

// QA's verdict on the card. Approving can also finish it (moves to the first
// "Concluído" column, through the board's rules); rejecting asks why and
// sends the card back to development, where the assignees are told.
export function ReviewSection({
  projectId,
  card,
  canValidate,
}: {
  projectId: string
  card: CardDetail
  canValidate: boolean
}) {
  const queryClient = useQueryClient()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const reviews = useQuery({
    queryKey: cardKeys.reviews(card.id),
    queryFn: () => http<Review[]>(`/cards/${card.id}/reviews`),
  })
  const review = useMutation({
    mutationFn: (input: ReviewInput) =>
      http<CardSummary>(`/cards/${card.id}/review`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (updated, input) => {
      upsertCard(queryClient, projectId, updated)
      toast.success(input.outcome === 'APPROVED' ? 'Card aprovado.' : 'Card reprovado e devolvido.')
    },
    // "Aprovar e concluir" may approve and then be stopped by a board rule.
    onError: (error) => toast.error(moveErrorMessage(error)),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: cardKeys.reviews(card.id) }),
        queryClient.invalidateQueries({ queryKey: cardKeys.byNumber(projectId, card.number) }),
      ]),
  })

  const history = reviews.data ?? []
  if (!canValidate && history.length === 0) return null

  return (
    <Section
      title="Validação do QA"
      aside={
        <>
          {card.qaStatus && (
            <Badge size="sm" variant="light" color={card.qaStatus === 'APPROVED' ? 'brand' : 'red'}>
              {card.qaStatus === 'APPROVED' ? 'Aprovado' : 'Reprovado'}
            </Badge>
          )}
          {card.rejectionCount > 0 && (
            <Text size="xs" c="dimmed">
              voltou {card.rejectionCount} {card.rejectionCount === 1 ? 'vez' : 'vezes'}
            </Text>
          )}
        </>
      }
    >
      {canValidate && (
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconCheck size={14} />}
            loading={review.isPending && review.variables?.outcome === 'APPROVED'}
            onClick={() => review.mutate({ outcome: 'APPROVED' })}
          >
            Aprovar
          </Button>
          <Button
            size="xs"
            leftSection={<IconChecks size={14} />}
            loading={review.isPending && review.variables?.complete === true}
            onClick={() => review.mutate({ outcome: 'APPROVED', complete: true })}
          >
            Aprovar e concluir
          </Button>
          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={<IconX size={14} />}
            onClick={() => setRejecting(true)}
          >
            Reprovar
          </Button>
        </Group>
      )}

      {history.length > 0 && (
        <ul className="card-drawer__list">
          {history.map((entry) => (
            <li key={entry.id}>
              <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm">
                  <Text span fw={600} c={entry.outcome === 'APPROVED' ? 'brand.7' : 'red.7'}>
                    {entry.outcome === 'APPROVED' ? 'Aprovado' : 'Reprovado'}
                  </Text>{' '}
                  por {entry.reviewer?.name ?? 'pessoa removida'}
                </Text>
                {entry.reason && (
                  <Text size="xs" c="dimmed">
                    “{entry.reason}”
                  </Text>
                )}
              </Stack>
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                {new Date(entry.createdAt).toLocaleString('pt-BR', {
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

      <Modal opened={rejecting} onClose={() => setRejecting(false)} title="Reprovar card">
        <Stack
          component="form"
          gap="md"
          onSubmit={(event) => {
            event.preventDefault()
            const trimmed = reason.trim()
            if (trimmed.length < 3) return
            review.mutate(
              { outcome: 'REJECTED', reason: trimmed },
              {
                onSuccess: () => {
                  setRejecting(false)
                  setReason('')
                },
              },
            )
          }}
        >
          <Text size="sm" c="dimmed">
            O card volta para a coluna de desenvolvimento e os responsáveis são avisados.
          </Text>
          <Textarea
            label="O que precisa ser corrigido?"
            autoFocus
            autosize
            minRows={3}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRejecting(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              color="red"
              loading={review.isPending}
              disabled={reason.trim().length < 3}
            >
              Reprovar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Section>
  )
}
