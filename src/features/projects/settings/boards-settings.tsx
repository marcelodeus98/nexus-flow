import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { IconPlus, IconStar, IconTestPipe, IconTrash } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  boardKeys,
  useBoards,
  useDeleteBoard,
  useSaveBoard,
  type BoardInfo,
} from '@/features/board/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { toast } from '@/shared/notify/toast'
import type { Project } from '../api'

const onError = (error: unknown) =>
  toast.error(
    apiErrorMessage(error, {
      409: 'Mova os cards do board (e escolha outro como padrão) antes de excluí-lo.',
    }),
  )

// A project can split its work across boards (e.g. development and support).
// New boards start with the default columns; the default board is the one
// /p/KEY opens and where cards created without a column go.
export function BoardsSettings({ project }: { project: Project }) {
  const boards = useBoards(project.id)
  const save = useSaveBoard(project.id)
  const remove = useDeleteBoard(project.id)
  const [name, setName] = useState('')
  const queryClient = useQueryClient()
  // Adds the "Em teste" column and the approval rule; nothing if present.
  const qaFlow = useMutation({
    mutationFn: (boardId: string) =>
      http<{ testingCreated: boolean; ruleCreated: boolean }>(`/boards/${boardId}/qa-flow`, {
        method: 'POST',
      }),
    onSuccess: (result, boardId) => {
      toast.success(
        result.testingCreated || result.ruleCreated
          ? 'Fluxo de QA ativado: coluna "Em teste" e regra de aprovação.'
          : 'Este board já tem o fluxo de QA.',
      )
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: boardKeys.all(project.id) }),
        queryClient.invalidateQueries({ queryKey: ['rules', boardId] }),
      ])
    },
    onError,
  })

  return (
    <Stack gap="md" maw={576}>
      <Stack gap="xs">
        {boards.data?.map((board) => (
          <Paper key={`${board.id}-${board.name}`} withBorder radius="md" p="xs">
            <Group gap="xs" wrap="nowrap">
              <TextInput
                defaultValue={board.name}
                aria-label="Nome do board"
                maxLength={40}
                size="xs"
                style={{ flex: 1 }}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && value !== board.name)
                    save.mutate({ id: board.id, name: value }, { onError })
                }}
              />
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconTestPipe size={14} />}
                loading={qaFlow.isPending && qaFlow.variables === board.id}
                onClick={() => qaFlow.mutate(board.id)}
              >
                Ativar fluxo de QA
              </Button>
              {board.isDefault ? (
                <Badge variant="light">Padrão</Badge>
              ) : (
                <>
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<IconStar size={14} />}
                    disabled={save.isPending}
                    onClick={() => save.mutate({ id: board.id, isDefault: true }, { onError })}
                  >
                    Tornar padrão
                  </Button>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={`Excluir ${board.name}`}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(board.id, { onError })}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </>
              )}
            </Group>
          </Paper>
        ))}
      </Stack>
      <Group
        component="form"
        gap="xs"
        wrap="nowrap"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) return
          save.mutate({ name: trimmed }, { onSuccess: () => setName(''), onError })
        }}
      >
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Novo board"
          aria-label="Nome do novo board"
          maxLength={40}
          style={{ flex: 1 }}
        />
        <Button
          type="submit"
          variant="default"
          leftSection={<IconPlus size={16} />}
          loading={save.isPending}
        >
          Adicionar
        </Button>
      </Group>
      <Text size="sm" c="dimmed">
        Só boards vazios podem ser excluídos. Para levar um card a outro board, use o campo Board no
        card.
      </Text>
    </Stack>
  )
}

// Which board the Columns and Rules tabs edit; hidden with a single board.
export function BoardPicker({
  boards,
  value,
  onChange,
}: {
  boards: BoardInfo[]
  value: string
  onChange: (boardId: string) => void
}) {
  if (boards.length < 2) return null
  return (
    <Select
      mb="md"
      w={240}
      aria-label="Board"
      value={value}
      onChange={(id) => id && onChange(id)}
      allowDeselect={false}
      data={boards.map((board) => ({ value: board.id, label: board.name }))}
    />
  )
}
