import { Select } from '@mantine/core'
import { toast } from '@/shared/notify/toast'
import { useSetSprintCards, useSprints } from '@/features/sprints/api'
import { apiErrorMessage } from '@/shared/api/errors'
import type { CardDetail } from '../api'

const BACKLOG = 'backlog'

// Which sprint the card is in. Closed sprints are not offered: a card is only
// planned into what is coming or running.
export function SprintField({
  projectId,
  card,
  editable,
}: {
  projectId: string
  card: CardDetail
  editable: boolean
}) {
  const sprints = useSprints(projectId)
  const setCards = useSetSprintCards(projectId)
  const current = sprints.data?.find((sprint) => sprint.id === card.sprintId)
  const options = (sprints.data ?? []).filter(
    (sprint) => sprint.status !== 'CLOSED' || sprint.id === card.sprintId,
  )

  function change(value: string | null) {
    if (!value) return
    const onError = (error: unknown) => toast.error(apiErrorMessage(error))
    if (value === BACKLOG) {
      if (card.sprintId)
        setCards.mutate({ sprintId: card.sprintId, remove: [card.id] }, { onError })
      return
    }
    setCards.mutate({ sprintId: value, add: [card.id] }, { onError })
  }

  return (
    <Select
      size="xs"
      aria-label="Sprint"
      value={card.sprintId ?? BACKLOG}
      disabled={!editable || current?.status === 'CLOSED' || setCards.isPending}
      onChange={change}
      allowDeselect={false}
      data={[
        { value: BACKLOG, label: 'Backlog (sem sprint)' },
        ...options.map((sprint) => ({
          value: sprint.id,
          label:
            sprint.name +
            (sprint.status === 'ACTIVE' ? ' (em andamento)' : '') +
            (sprint.status === 'CLOSED' ? ' (encerrada)' : ''),
        })),
      ]}
    />
  )
}
