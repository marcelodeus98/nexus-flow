import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { PlusIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/shared/api/errors'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
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
      className={`flex max-h-full flex-col rounded-xl ${isOver ? 'bg-primary/10' : 'bg-muted/70'} ${className}`}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <h2 className="text-sm font-semibold">{column.name}</h2>
        <span
          className={`rounded-full px-2 text-xs ${
            overLimit ? 'bg-destructive/15 font-semibold text-destructive' : 'text-muted-foreground'
          }`}
          title={column.wipLimit !== null ? `Limite de WIP: ${column.wipLimit}` : undefined}
        >
          {cards.length}
          {column.wipLimit !== null && `/${column.wipLimit}`}
        </span>
      </header>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul className="min-h-16 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
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

  function submit(event?: FormEvent) {
    event?.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return setOpen(false)
    // Cleared right away: the next title may be typed before the response
    // (the socket can show the new card first). Restored if creation fails.
    setTitle('')
    create.mutate(
      { title: trimmed, columnId },
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
      <Button
        variant="ghost"
        size="sm"
        className="mx-2 mb-2 justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <PlusIcon /> Adicionar card
      </Button>
    )
  }
  return (
    <form onSubmit={submit} className="space-y-2 px-2 pb-2">
      <Textarea
        autoFocus
        rows={2}
        maxLength={200}
        placeholder="Título do card"
        aria-label="Título do novo card"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) submit(e)
          if (e.key === 'Escape') setOpen(false)
        }}
        className="bg-background"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={create.isPending}>
          Adicionar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
