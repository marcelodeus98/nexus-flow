import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button, Checkbox, Group, Stack, Textarea } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { toast } from '@/shared/notify/toast'
import { apiErrorMessage } from '@/shared/api/errors'
import { useCreateCard, type BoardColumn as Column, type CardSummary } from './api'
import { SortableCard, type CardLookups } from './board-card'

export function BoardColumn({
  projectId,
  column,
  cards,
  lookups,
  canCreate,
  canMove,
  className = '',
}: {
  projectId: string
  column: Column
  cards: CardSummary[]
  lookups: CardLookups
  canCreate: boolean
  canMove: boolean
  className?: string
}) {
  // The whole column receives drops: header, empty space, below the last card.
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column' } })
  const overLimit = column.wipLimit !== null && cards.length > column.wipLimit

  return (
    <section
      ref={setNodeRef}
      aria-label={column.name}
      className={`board-column${isOver ? ' board-column--over' : ''} ${className}`}
    >
      <header className="board-column__header">
        <h2 className="board-column__name">{column.name}</h2>
        <span
          className={`board-column__count${overLimit ? ' board-column__count--over' : ''}`}
          title={column.wipLimit !== null ? `Limite de WIP: ${column.wipLimit}` : undefined}
        >
          {cards.length}
          {column.wipLimit !== null && `/${column.wipLimit}`}
        </span>
      </header>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul className="board-column__cards">
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} lookups={lookups} draggable={canMove} />
          ))}
        </ul>
      </SortableContext>
      {canCreate && <AddCard projectId={projectId} columnId={column.id} />}
    </section>
  )
}

function AddCard({ projectId, columnId }: { projectId: string; columnId: string }) {
  const create = useCreateCard(projectId)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [isBug, setIsBug] = useState(false)

  function submit(event?: FormEvent) {
    event?.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return setOpen(false)
    // Cleared right away: the next title may be typed before the response
    // (the socket can show the new card first). Restored if creation fails.
    setTitle('')
    create.mutate(
      { title: trimmed, columnId, ...(isBug && { type: 'BUG' as const }) },
      {
        onError: (error) => {
          toast.error(apiErrorMessage(error))
          setTitle((current) => current || trimmed)
        },
      },
    )
  }

  if (!open) {
    return (
      <div className="board-column__add">
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          fullWidth
          justify="flex-start"
          leftSection={<IconPlus size={14} />}
          onClick={() => setOpen(true)}
        >
          Adicionar card
        </Button>
      </div>
    )
  }
  return (
    <form onSubmit={submit} className="board-column__add">
      <Stack gap="xs">
        <Textarea
          autoFocus
          autosize
          minRows={2}
          maxLength={200}
          placeholder="Título do card"
          aria-label="Título do novo card"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e)
            if (e.key === 'Escape') setOpen(false)
          }}
        />
        <Checkbox
          size="xs"
          label="É um bug"
          checked={isBug}
          onChange={(e) => setIsBug(e.currentTarget.checked)}
        />
        <Group gap="xs">
          <Button type="submit" size="xs" loading={create.isPending}>
            Adicionar
          </Button>
          <Button size="xs" variant="subtle" color="gray" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
