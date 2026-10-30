import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ActionIcon, Button, ColorInput, Group, Paper, Stack, Text, TextInput } from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { toast } from '@/shared/notify/toast'
import type { Tag } from '@/features/board/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'

// Editable list of tags under one endpoint: a project's (/projects/:id/tags)
// or the global ones (/tags, admin). Every project's tag list includes the
// global tags, so a change refreshes all of them.
export function TagEditor({
  endpoint,
  tags,
  loaded,
  emptyText,
}: {
  endpoint: string
  tags: Tag[]
  loaded: boolean
  emptyText: string
}) {
  const queryClient = useQueryClient()
  const options = {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
    onError: (error: unknown) =>
      toast.error(apiErrorMessage(error, { 409: 'Já existe uma tag com esse nome.' })),
  }
  const create = useMutation({
    mutationFn: (input: { name: string; color: string }) =>
      http<Tag>(endpoint, { method: 'POST', body: JSON.stringify(input) }),
    ...options,
  })
  const update = useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; color?: string }) =>
      http<Tag>(`${endpoint}/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    ...options,
  })
  const remove = useMutation({
    mutationFn: (id: string) => http<void>(`${endpoint}/${id}`, { method: 'DELETE' }),
    ...options,
  })
  const [name, setName] = useState('')
  const [color, setColor] = useState('#017A72')

  return (
    <Stack gap="md">
      <Stack gap="xs">
        {tags.map((tag) => (
          <Paper key={`${tag.id}-${tag.name}-${tag.color}`} withBorder radius="md" p="xs">
            <Group gap="xs" wrap="nowrap">
              <ColorInput
                format="hex"
                defaultValue={tag.color}
                aria-label={`Cor de ${tag.name}`}
                w={130}
                size="xs"
                onChangeEnd={(value) => {
                  const color = value.toUpperCase()
                  if (color !== tag.color.toUpperCase()) update.mutate({ id: tag.id, color })
                }}
              />
              <TextInput
                defaultValue={tag.name}
                aria-label="Nome da tag"
                maxLength={30}
                size="xs"
                style={{ flex: 1 }}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && value !== tag.name) update.mutate({ id: tag.id, name: value })
                }}
              />
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Excluir ${tag.name}`}
                onClick={() => remove.mutate(tag.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}
        {loaded && tags.length === 0 && (
          <Text size="sm" c="dimmed">
            {emptyText}
          </Text>
        )}
      </Stack>
      <Group
        component="form"
        gap="xs"
        wrap="nowrap"
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
        <ColorInput
          format="hex"
          value={color}
          onChange={setColor}
          aria-label="Cor da nova tag"
          w={130}
        />
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova tag"
          aria-label="Nome da nova tag"
          maxLength={30}
          style={{ flex: 1 }}
        />
        <Button
          type="submit"
          variant="default"
          leftSection={<IconPlus size={16} />}
          loading={create.isPending}
        >
          Adicionar
        </Button>
      </Group>
    </Stack>
  )
}
