import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { boardKeys, useTags, type Tag } from '@/features/board/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import type { Project } from '../api'

// Project tags are edited here; global tags (admin) are listed read-only.
export function TagsSettings({ project }: { project: Project }) {
  const tags = useTags(project.id)
  const queryClient = useQueryClient()
  const options = {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.tags(project.id) }),
    onError: (error: unknown) =>
      toast.error(apiErrorMessage(error, { 409: 'Já existe uma tag com esse nome.' })),
  }
  const create = useMutation({
    mutationFn: (input: { name: string; color: string }) =>
      http<Tag>(`/projects/${project.id}/tags`, { method: 'POST', body: JSON.stringify(input) }),
    ...options,
  })
  const update = useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; color?: string }) =>
      http<Tag>(`/projects/${project.id}/tags/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    ...options,
  })
  const remove = useMutation({
    mutationFn: (id: string) =>
      http<void>(`/projects/${project.id}/tags/${id}`, { method: 'DELETE' }),
    ...options,
  })
  const [name, setName] = useState('')
  const [color, setColor] = useState('#2563EB')

  const own = tags.data?.filter((tag) => tag.projectId) ?? []
  const global = tags.data?.filter((tag) => !tag.projectId) ?? []

  return (
    <div className="max-w-xl space-y-6">
      <ul className="space-y-2">
        {own.map((tag) => (
          <li
            key={`${tag.id}-${tag.name}-${tag.color}`}
            className="flex items-center gap-2 rounded-lg border bg-background p-2"
          >
            <Input
              type="color"
              defaultValue={tag.color}
              aria-label={`Cor de ${tag.name}`}
              className="h-8 w-12 p-1"
              onBlur={(e) => {
                const value = e.target.value.toUpperCase()
                if (value !== tag.color.toUpperCase()) update.mutate({ id: tag.id, color: value })
              }}
            />
            <Input
              defaultValue={tag.name}
              aria-label="Nome da tag"
              maxLength={30}
              className="h-8 flex-1"
              onBlur={(e) => {
                const value = e.target.value.trim()
                if (value && value !== tag.name) update.mutate({ id: tag.id, name: value })
              }}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Excluir ${tag.name}`}
              onClick={() => remove.mutate(tag.id)}
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
        {tags.isSuccess && own.length === 0 && (
          <li className="text-sm text-muted-foreground">
            Este projeto ainda não tem tags próprias.
          </li>
        )}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) return
          create.mutate(
            { name: trimmed, color: color.toUpperCase() },
            { onSuccess: () => setName('') },
          )
        }}
      >
        <Input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label="Cor da nova tag"
          className="h-9 w-12 p-1"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova tag"
          aria-label="Nome da nova tag"
          maxLength={30}
          className="flex-1"
        />
        <Button type="submit" variant="outline" disabled={create.isPending}>
          <PlusIcon /> Adicionar
        </Button>
      </form>
      {global.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Tags globais (definidas pela administração)</h3>
          <div className="flex flex-wrap gap-1.5">
            {global.map((tag) => (
              <span
                key={tag.id}
                className="rounded px-2 py-0.5 text-xs"
                style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
