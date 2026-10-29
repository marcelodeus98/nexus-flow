import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { upsertCard } from '@/features/board/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { cardKeys, type CardDetail, type ChecklistItem } from '../api'

// Every checklist call answers with the whole card (new version, new
// progress), which goes straight into the caches.
function useChecklist(projectId: string, card: CardDetail) {
  const queryClient = useQueryClient()
  const onSuccess = (updated: CardDetail) => {
    queryClient.setQueryData(cardKeys.byNumber(projectId, updated.number), updated)
    upsertCard(queryClient, projectId, updated)
  }
  const onError = (error: unknown) => toast.error(apiErrorMessage(error))
  const add = useMutation({
    mutationFn: (input: { title: string; kind: ChecklistItem['kind'] }) =>
      http<CardDetail>(`/cards/${card.id}/checklist`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess,
    onError,
  })
  const update = useMutation({
    mutationFn: ({ id, ...patch }: { id: string; done?: boolean; title?: string }) =>
      http<CardDetail>(`/checklist-items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess,
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => http<CardDetail>(`/checklist-items/${id}`, { method: 'DELETE' }),
    onSuccess,
    onError,
  })
  return { add, update, remove }
}

export function ChecklistSection({
  projectId,
  card,
  editable,
}: {
  projectId: string
  card: CardDetail
  editable: boolean
}) {
  const { add, update, remove } = useChecklist(projectId, card)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<ChecklistItem['kind']>('GENERAL')
  const done = card.checklist.filter((item) => item.done).length

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        Checklist
        {card.checklist.length > 0 && (
          <span className="font-normal text-muted-foreground">
            {done}/{card.checklist.length}
          </span>
        )}
      </h3>
      {card.checklist.length > 0 && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemax={card.checklist.length}
          aria-label="Progresso do checklist"
        >
          <div
            className="h-full bg-emerald-600 transition-all"
            style={{ width: `${(done / card.checklist.length) * 100}%` }}
          />
        </div>
      )}
      <ul className="space-y-1">
        {card.checklist.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 text-sm">
            <Checkbox
              checked={item.done}
              disabled={!editable || update.isPending}
              aria-label={item.title}
              onCheckedChange={(checked) => update.mutate({ id: item.id, done: checked === true })}
            />
            <span className={`flex-1 ${item.done ? 'text-muted-foreground line-through' : ''}`}>
              {item.title}
            </span>
            {item.kind === 'QA' && <Badge variant="secondary">QA</Badge>}
            {editable && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Remover ${item.title}`}
                onClick={() => remove.mutate(item.id)}
              >
                <Trash2Icon />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const trimmed = title.trim()
            if (!trimmed) return
            add.mutate({ title: trimmed, kind }, { onSuccess: () => setTitle('') })
          }}
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Novo item"
            aria-label="Novo item do checklist"
            maxLength={200}
            className="h-8 flex-1"
          />
          <Select value={kind} onValueChange={(v) => setKind(v as ChecklistItem['kind'])}>
            <SelectTrigger size="sm" className="w-24" aria-label="Tipo do item">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">Geral</SelectItem>
              <SelectItem value="QA">QA</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" variant="outline" disabled={add.isPending}>
            Adicionar
          </Button>
        </form>
      )}
    </section>
  )
}
