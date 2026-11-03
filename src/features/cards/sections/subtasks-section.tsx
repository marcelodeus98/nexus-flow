import { Badge, Button, Group, Progress, Stack, Text, TextInput } from '@mantine/core'
import { IconBug, IconPlus, IconSubtask } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCreateCard, type BoardColumn } from '@/features/board/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { toast } from '@/shared/notify/toast'
import { cardKeys, type CardDetail } from '../api'
import { Section } from './section'

// Subtasks are cards like any other (own column, assignees, time, QA...)
// whose parent is this one. A subtask can have its own subtasks: e.g. a
// story → "Front" and "Backend" → the backend's tasks. Each level is opened
// in its own drawer, so the tree is walked one level at a time.
export function SubtasksSection({
  projectId,
  projectKey,
  card,
  columns,
  canCreate,
}: {
  projectId: string
  projectKey: string
  card: CardDetail
  // The card's board, to put new subtasks in its first "A fazer" column.
  columns: BoardColumn[]
  canCreate: boolean
}) {
  const queryClient = useQueryClient()
  const create = useCreateCard(projectId)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const total = card.children.length
  const done = card.children.filter((child) => child.done).length

  if (total === 0 && !canCreate) return null

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const column = columns.find((c) => c.category === 'TODO') ?? columns[0]
    if (!column) return
    create.mutate(
      { title: trimmed, columnId: column.id, parentId: card.id },
      {
        onSuccess: () => {
          setTitle('')
          void queryClient.invalidateQueries({
            queryKey: cardKeys.byNumber(projectId, card.number),
          })
        },
        onError: (error) => toast.error(apiErrorMessage(error)),
      },
    )
  }

  return (
    <Section
      title="Subtarefas"
      aside={
        <>
          {total > 0 && (
            <Text size="sm" c="dimmed">
              {done}/{total} concluídas
            </Text>
          )}
          {canCreate && !adding && (
            <Button
              ml="auto"
              size="xs"
              variant="subtle"
              leftSection={<IconPlus size={14} />}
              onClick={() => setAdding(true)}
            >
              Nova subtarefa
            </Button>
          )}
        </>
      }
    >
      {total > 0 && (
        <Progress size="sm" value={(done / total) * 100} aria-label="Subtarefas concluídas" />
      )}
      {total > 0 && (
        <ul className="card-drawer__list">
          {card.children.map((child) => (
            <li key={child.id}>
              <Text
                size="sm"
                style={{ flex: 1, minWidth: 0 }}
                td={child.done ? 'line-through' : undefined}
                c={child.done ? 'dimmed' : undefined}
              >
                <Link to={`/p/${projectKey}/c/${child.number}`} className="card-drawer__link">
                  {child.type === 'BUG' && (
                    <IconBug size={12} color="var(--mantine-color-red-6)" aria-label="Bug" />
                  )}{' '}
                  <Text span size="xs" c="dimmed" ff="monospace">
                    {projectKey}-{child.number}
                  </Text>{' '}
                  {child.title}
                </Link>
              </Text>
              {child.subtasksTotal > 0 && (
                <Group gap={2} wrap="nowrap" title="Subtarefas desta subtarefa">
                  <IconSubtask size={12} color="var(--nexa-slate)" />
                  <Text size="xs" c="dimmed">
                    {child.subtasksDone}/{child.subtasksTotal}
                  </Text>
                </Group>
              )}
              <Badge size="sm" variant="light" color={child.done ? 'brand' : 'gray'} tt="none">
                {child.columnName}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <form onSubmit={submit}>
          <Stack gap={4}>
            <Group gap="xs" wrap="nowrap">
              <TextInput
                size="xs"
                autoFocus
                style={{ flex: 1 }}
                placeholder="Título da subtarefa (ex.: Backend - endpoint de login)"
                aria-label="Título da nova subtarefa"
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
              />
              <Button type="submit" size="xs" loading={create.isPending}>
                Adicionar
              </Button>
              <Button size="xs" variant="subtle" color="gray" onClick={() => setAdding(false)}>
                Fechar
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              Entra em "A fazer" deste board. Abra a subtarefa para criar subtarefas dela.
            </Text>
          </Stack>
        </form>
      )}
    </Section>
  )
}
