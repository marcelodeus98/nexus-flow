import { Anchor, Group, Stack, Text } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from '@/shared/notify/toast'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { cardKeys } from '../api'
import { CommentEditor } from './comment-editor'
import type { MentionItem } from './mention-list'
import { RichTextView } from './rich-text-view'
import { Section } from './section'

type Comment = {
  id: string
  cardId: string
  body: Record<string, unknown>
  mentions: string[]
  createdAt: string
  editedAt: string | null
  author: { id: string; name: string } | null
}

export function CommentsSection({
  cardId,
  members,
  userId,
  canComment,
  canModerate,
}: {
  cardId: string
  members: MentionItem[]
  userId: string
  canComment: boolean
  canModerate: boolean
}) {
  const queryClient = useQueryClient()
  const key = cardKeys.comments(cardId)
  const comments = useQuery({
    queryKey: key,
    queryFn: () => http<Comment[]>(`/cards/${cardId}/comments`),
  })
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: key })
  const onError = (error: unknown) => toast.error(apiErrorMessage(error))
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      http<Comment>(`/cards/${cardId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess,
    onError,
  })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      http<Comment>(`/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ body }) }),
    onSuccess,
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => http<void>(`/comments/${id}`, { method: 'DELETE' }),
    onSuccess,
    onError,
  })
  const [editing, setEditing] = useState<string>()

  return (
    <Section title={`Comentários${comments.data?.length ? ` (${comments.data.length})` : ''}`}>
      <Stack gap="md">
        {comments.data?.map((comment) => (
          <Stack key={comment.id} gap={4}>
            <Group gap="xs" align="baseline">
              <Text size="xs" fw={600}>
                {comment.author?.name ?? 'Pessoa removida'}
              </Text>
              <Text size="xs" c="dimmed">
                {new Date(comment.createdAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {comment.editedAt && ' · editado'}
              </Text>
              <Group gap="xs" ml="auto">
                {comment.author?.id === userId && editing !== comment.id && (
                  <Anchor component="button" size="xs" onClick={() => setEditing(comment.id)}>
                    Editar
                  </Anchor>
                )}
                {(comment.author?.id === userId || canModerate) && (
                  <Anchor
                    component="button"
                    size="xs"
                    c="red"
                    onClick={() => remove.mutate(comment.id)}
                  >
                    Excluir
                  </Anchor>
                )}
              </Group>
            </Group>
            {editing === comment.id ? (
              <CommentEditor
                members={members}
                initial={comment.body}
                submitLabel="Salvar"
                pending={update.isPending}
                onCancel={() => setEditing(undefined)}
                onSubmit={(body) =>
                  update.mutate(
                    { id: comment.id, body },
                    { onSuccess: () => setEditing(undefined) },
                  )
                }
              />
            ) : (
              <div className="comment-bubble">
                <RichTextView doc={comment.body} />
              </div>
            )}
          </Stack>
        ))}
      </Stack>
      {canComment && (
        <CommentEditor
          members={members}
          submitLabel="Comentar"
          pending={create.isPending}
          onSubmit={(body) => create.mutate(body)}
        />
      )}
    </Section>
  )
}
