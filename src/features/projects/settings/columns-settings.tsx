import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  boardKeys,
  categoryLabels,
  useBoard,
  type BoardColumn,
  type ColumnCategory,
} from '@/features/board/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import type { Project } from '../api'

const categories = Object.keys(categoryLabels) as ColumnCategory[]

function useColumnMutation<T>(projectId: string, request: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.board(projectId) }),
    onError: (error) =>
      toast.error(
        apiErrorMessage(error, {
          409: 'Mova os cards da coluna antes de excluí-la (o board precisa de ao menos uma coluna).',
        }),
      ),
  })
}

// The category says what a column means (to do, in progress, done...), so
// reports and future rules work whatever the column is called.
export function ColumnsSettings({ project }: { project: Project }) {
  const board = useBoard(project.id)
  const create = useColumnMutation(
    project.id,
    (input: { name: string; category: ColumnCategory }) =>
      http(`/boards/${project.defaultBoardId}/columns`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  )
  const update = useColumnMutation(
    project.id,
    ({ id, ...patch }: { id: string } & Partial<Omit<BoardColumn, 'id' | 'rank'>>) =>
      http(`/columns/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  )
  const reorder = useColumnMutation(
    project.id,
    ({ id, ...position }: { id: string; afterId?: string; beforeId?: string }) =>
      http(`/columns/${id}/rank`, { method: 'PATCH', body: JSON.stringify(position) }),
  )
  const remove = useColumnMutation(project.id, (id: string) =>
    http(`/columns/${id}`, { method: 'DELETE' }),
  )
  const [newName, setNewName] = useState('')

  const columns = board.data?.columns ?? []
  const counts = new Map<string, number>()
  for (const card of board.data?.cards ?? []) {
    counts.set(card.columnId, (counts.get(card.columnId) ?? 0) + 1)
  }

  return (
    <div className="max-w-3xl space-y-4">
      <ol className="space-y-2">
        {columns.map((column, index) => (
          <li
            key={`${column.id}-${column.name}-${column.wipLimit}`}
            className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2"
          >
            <div className="flex">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Mover ${column.name} para a esquerda`}
                disabled={index === 0 || reorder.isPending}
                onClick={() =>
                  reorder.mutate({
                    id: column.id,
                    afterId: columns[index - 2]?.id,
                    beforeId: columns[index - 1].id,
                  })
                }
              >
                <ArrowUpIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Mover ${column.name} para a direita`}
                disabled={index === columns.length - 1 || reorder.isPending}
                onClick={() =>
                  reorder.mutate({
                    id: column.id,
                    afterId: columns[index + 1].id,
                    beforeId: columns[index + 2]?.id,
                  })
                }
              >
                <ArrowDownIcon />
              </Button>
            </div>
            <Input
              defaultValue={column.name}
              aria-label="Nome da coluna"
              maxLength={40}
              className="h-8 w-44"
              onBlur={(e) => {
                const name = e.target.value.trim()
                if (name && name !== column.name) update.mutate({ id: column.id, name })
              }}
            />
            <Select
              value={column.category}
              onValueChange={(category) =>
                update.mutate({ id: column.id, category: category as ColumnCategory })
              }
            >
              <SelectTrigger size="sm" className="w-36" aria-label={`Categoria de ${column.name}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {categoryLabels[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              max={999}
              defaultValue={column.wipLimit ?? ''}
              placeholder="Sem limite"
              aria-label={`Limite de WIP de ${column.name}`}
              title="Limite de WIP"
              className="h-8 w-28"
              onBlur={(e) => {
                const wipLimit = e.target.value === '' ? null : Number(e.target.value)
                if (wipLimit !== column.wipLimit) update.mutate({ id: column.id, wipLimit })
              }}
            />
            <span className="text-xs text-muted-foreground">
              {(counts.get(column.id) ?? 0) === 1
                ? '1 card'
                : `${counts.get(column.id) ?? 0} cards`}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto"
              aria-label={`Excluir ${column.name}`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(column.id)}
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
      </ol>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const name = newName.trim()
          if (!name) return
          create.mutate({ name, category: 'TODO' }, { onSuccess: () => setNewName('') })
        }}
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova coluna"
          aria-label="Nome da nova coluna"
          maxLength={40}
          className="w-56"
        />
        <Button type="submit" variant="outline" disabled={create.isPending}>
          <PlusIcon /> Adicionar
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        O limite de WIP aparece no board quando é ultrapassado. O bloqueio de entrada chega com as
        regras de transição.
      </p>
    </div>
  )
}
