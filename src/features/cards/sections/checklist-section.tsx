import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { toast } from '@/shared/notify/toast'
import { upsertCard } from '@/features/board/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { cardKeys, type CardDetail, type ChecklistItem } from '../api'
import { Section } from './section'

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

// QA items are the card's validation: only who can validate (QA, PO,
// manager) adds, ticks or removes them. The API enforces the same.
export function ChecklistSection({
  projectId,
  card,
  editable,
  validatable,
}: {
  projectId: string
  card: CardDetail
  editable: boolean
  validatable: boolean
}) {
  const { add, update, remove } = useChecklist(projectId, card)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<ChecklistItem['kind']>('GENERAL')
  const done = card.checklist.filter((item) => item.done).length

  return (
    <Section
      title="Checklist"
      aside={
        card.checklist.length > 0 && (
          <Text size="sm" c="dimmed">
            {done}/{card.checklist.length}
          </Text>
        )
      }
    >
      {card.checklist.length > 0 && (
        <Progress
          size="sm"
          value={(done / card.checklist.length) * 100}
          aria-label="Progresso do checklist"
        />
      )}
      <Stack gap={6}>
        {card.checklist.map((item) => {
          const itemEditable = item.kind === 'QA' ? validatable : editable
          return (
            <Group key={item.id} gap="xs" wrap="nowrap" className="checklist-item">
              <Checkbox
                checked={item.done}
                disabled={!itemEditable || update.isPending}
                aria-label={item.title}
                onChange={(e) => update.mutate({ id: item.id, done: e.currentTarget.checked })}
              />
              <Text
                size="sm"
                style={{ flex: 1 }}
                c={item.done ? 'dimmed' : undefined}
                td={item.done ? 'line-through' : undefined}
              >
                {item.title}
              </Text>
              {item.kind === 'QA' && (
                <Tooltip label="Só QA, PO ou gestor alteram itens de QA" disabled={validatable}>
                  <Badge size="sm" variant="light" color="navy">
                    QA
                  </Badge>
                </Tooltip>
              )}
              {itemEditable && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  className="checklist-item__remove"
                  aria-label={`Remover ${item.title}`}
                  onClick={() => remove.mutate(item.id)}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              )}
            </Group>
          )
        })}
      </Stack>
      {editable && (
        <Group
          component="form"
          gap="xs"
          wrap="nowrap"
          onSubmit={(event) => {
            event.preventDefault()
            const trimmed = title.trim()
            if (!trimmed) return
            add.mutate({ title: trimmed, kind }, { onSuccess: () => setTitle('') })
          }}
        >
          <TextInput
            size="xs"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Novo item"
            aria-label="Novo item do checklist"
            maxLength={200}
            style={{ flex: 1 }}
          />
          {validatable && (
            <Select
              size="xs"
              w={96}
              aria-label="Tipo do item"
              value={kind}
              onChange={(v) => v && setKind(v as ChecklistItem['kind'])}
              allowDeselect={false}
              data={[
                { value: 'GENERAL', label: 'Geral' },
                { value: 'QA', label: 'QA' },
              ]}
            />
          )}
          <Button type="submit" size="xs" variant="default" loading={add.isPending}>
            Adicionar
          </Button>
        </Group>
      )}
    </Section>
  )
}
