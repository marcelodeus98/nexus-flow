import { toast } from 'sonner'
import { useSetSprintCards, useSprints } from '@/features/sprints/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
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

  function change(value: string) {
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
      value={card.sprintId ?? BACKLOG}
      disabled={!editable || current?.status === 'CLOSED' || setCards.isPending}
      onValueChange={change}
    >
      <SelectTrigger size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={BACKLOG}>Backlog (sem sprint)</SelectItem>
        {options.map((sprint) => (
          <SelectItem key={sprint.id} value={sprint.id}>
            {sprint.name}
            {sprint.status === 'ACTIVE' && ' (em andamento)'}
            {sprint.status === 'CLOSED' && ' (encerrada)'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
