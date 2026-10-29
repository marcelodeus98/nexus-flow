import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { Button } from '@/shared/ui/button'
import { cardKeys } from '../api'
import { CommentEditor } from './comment-editor'
import type { MentionItem } from './mention-list'
import { RichTextView } from './rich-text-view'

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
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">
        Comentários{comments.data?.length ? ` (${comments.data.length})` : ''}
      </h3>
      <ol className="space-y-3">
        {comments.data?.map((comment) => (
          <li key={comment.id} className="space-y-1">
            <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {comment.author?.name ?? 'Pessoa removida'}
              </span>
              <span>
                {new Date(comment.createdAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {comment.editedAt && ' · editado'}
              </span>
              <span className="ml-auto flex gap-1">
                {comment.author?.id === userId && editing !== comment.id && (
                  <Button variant="link" size="xs" onClick={() => setEditing(comment.id)}>
                    Editar
                  </Button>
                )}
                {(comment.author?.id === userId || canModerate) && (
                  <Button variant="link" size="xs" onClick={() => remove.mutate(comment.id)}>
                    Excluir
                  </Button>
                )}
              </span>
            </div>
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
              <div className="rounded-lg bg-muted/60 px-3 py-2">
                <RichTextView doc={comment.body} />
              </div>
            )}
          </li>
        ))}
      </ol>
      {canComment && (
        <CommentEditor
          members={members}
          submitLabel="Comentar"
          pending={create.isPending}
          onSubmit={(body) => create.mutate(body)}
        />
      )}
    </section>
  )
}
