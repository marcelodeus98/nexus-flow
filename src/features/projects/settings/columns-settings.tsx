import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { toast } from '@/shared/notify/toast'
import {
  boardKeys,
  categoryLabels,
  useBoard,
  type BoardColumn,
  type ColumnCategory,
} from '@/features/board/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import type { Project } from '../api'

const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))

function useColumnMutation<T>(projectId: string, request: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.all(projectId) }),
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
export function ColumnsSettings({ project, boardId }: { project: Project; boardId: string }) {
  const board = useBoard(project.id, boardId)
  const create = useColumnMutation(
    project.id,
    (input: { name: string; category: ColumnCategory }) =>
      http(`/boards/${boardId}/columns`, {
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
    <Stack gap="md" maw={768}>
      <Stack gap="xs">
        {columns.map((column, index) => (
          <Paper
            key={`${column.id}-${column.name}-${column.wipLimit}`}
            withBorder
            radius="md"
            p="xs"
          >
            <Group gap="xs">
              <Group gap={0}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
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
                  <IconArrowUp size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="gray"
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
                  <IconArrowDown size={16} />
                </ActionIcon>
              </Group>
              <TextInput
                defaultValue={column.name}
                aria-label="Nome da coluna"
                maxLength={40}
                size="xs"
                w={180}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (name && name !== column.name) update.mutate({ id: column.id, name })
                }}
              />
              <Select
                size="xs"
                w={150}
                aria-label={`Categoria de ${column.name}`}
                value={column.category}
                onChange={(category) =>
                  category && update.mutate({ id: column.id, category: category as ColumnCategory })
                }
                allowDeselect={false}
                data={categoryOptions}
              />
              <NumberInput
                size="xs"
                w={120}
                min={1}
                max={999}
                defaultValue={column.wipLimit ?? ''}
                placeholder="Sem limite"
                aria-label={`Limite de WIP de ${column.name}`}
                title="Limite de WIP"
                onBlur={(e) => {
                  const wipLimit = e.target.value === '' ? null : Number(e.target.value)
                  if (wipLimit !== column.wipLimit) update.mutate({ id: column.id, wipLimit })
                }}
              />
              <Text size="xs" c="dimmed">
                {(counts.get(column.id) ?? 0) === 1
                  ? '1 card'
                  : `${counts.get(column.id) ?? 0} cards`}
              </Text>
              <ActionIcon
                ml="auto"
                variant="subtle"
                color="red"
                aria-label={`Excluir ${column.name}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate(column.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}
      </Stack>
      <Group
        component="form"
        gap="xs"
        onSubmit={(event) => {
          event.preventDefault()
          const name = newName.trim()
          if (!name) return
          create.mutate({ name, category: 'TODO' }, { onSuccess: () => setNewName('') })
        }}
      >
        <TextInput
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova coluna"
          aria-label="Nome da nova coluna"
          maxLength={40}
          w={240}
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
      <Text size="sm" c="dimmed">
        O limite de WIP aparece no board quando é ultrapassado. Para bloquear a entrada, crie a
        regra "Respeitar o limite de WIP" na aba Regras.
      </Text>
    </Stack>
  )
}
