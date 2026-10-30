import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActionIcon, Button, Text } from '@mantine/core'
import { IconDownload, IconPaperclip, IconTrash } from '@tabler/icons-react'
import axios from 'axios'
import { useRef, useState } from 'react'
import { toast } from '@/shared/notify/toast'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { cardKeys } from '../api'
import { Section } from './section'

type Attachment = {
  id: string
  fileName: string
  mimeType: string
  size: number
  createdAt: string
  uploader: { id: string; name: string } | null
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Files go from the browser straight to R2: presign, PUT to the signed URL,
// then confirm. The API never handles the bytes.
async function upload(cardId: string, file: File) {
  const mimeType = file.type || 'application/octet-stream'
  const presigned = await http<{
    storageKey: string
    uploadUrl: string
    headers: Record<string, string>
  }>(`/cards/${cardId}/attachments/presign`, {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, mimeType, size: file.size }),
  })
  // Straight to storage: not the API client (no token, no cookies).
  await axios.put(presigned.uploadUrl, file, { headers: presigned.headers })
  return http<Attachment>(`/cards/${cardId}/attachments`, {
    method: 'POST',
    body: JSON.stringify({ storageKey: presigned.storageKey, fileName: file.name, mimeType }),
  })
}

export function AttachmentsSection({
  cardId,
  userId,
  canEdit,
  canModerate,
}: {
  cardId: string
  userId: string
  canEdit: boolean
  canModerate: boolean
}) {
  const queryClient = useQueryClient()
  const key = cardKeys.attachments(cardId)
  const config = useQuery({
    queryKey: ['attachments', 'config'],
    queryFn: () => http<{ enabled: boolean; maxBytes: number }>('/attachments/config'),
    staleTime: Infinity,
  })
  const attachments = useQuery({
    queryKey: key,
    queryFn: () => http<Attachment[]>(`/cards/${cardId}/attachments`),
  })
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const remove = useMutation({
    mutationFn: (id: string) => http<void>(`/attachments/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  async function onFiles(files: FileList | null) {
    const maxBytes = config.data?.maxBytes ?? 0
    for (const file of Array.from(files ?? [])) {
      if (file.size > maxBytes) {
        toast.error(`${file.name}: o limite é ${formatSize(maxBytes)}.`)
        continue
      }
      setUploading((n) => n + 1)
      try {
        await upload(cardId, file)
      } catch (error) {
        toast.error(`${file.name}: ${apiErrorMessage(error)}`)
      } finally {
        setUploading((n) => n - 1)
      }
    }
    await queryClient.invalidateQueries({ queryKey: key })
  }

  async function download(id: string) {
    try {
      const { url } = await http<{ url: string }>(`/attachments/${id}/download`)
      window.location.assign(url)
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  const enabled = config.data?.enabled ?? false
  const list = attachments.data ?? []
  if (!enabled && list.length === 0) return null

  return (
    <Section
      title="Anexos"
      aside={
        canEdit &&
        enabled && (
          <>
            <Button
              ml="auto"
              size="xs"
              variant="subtle"
              leftSection={<IconPaperclip size={14} />}
              loading={uploading > 0}
              onClick={() => input.current?.click()}
            >
              Anexar arquivo
            </Button>
            <input
              ref={input}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                void onFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </>
        )
      }
    >
      {list.length > 0 && (
        <ul className="card-drawer__list">
          {list.map((attachment) => (
            <li key={attachment.id}>
              <Text span size="sm" truncate title={attachment.fileName} style={{ flex: 1 }}>
                {attachment.fileName}
              </Text>
              <Text span size="xs" c="dimmed">
                {formatSize(attachment.size)}
              </Text>
              {enabled && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label={`Baixar ${attachment.fileName}`}
                  onClick={() => void download(attachment.id)}
                >
                  <IconDownload size={14} />
                </ActionIcon>
              )}
              {canEdit && (attachment.uploader?.id === userId || canModerate) && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label={`Excluir ${attachment.fileName}`}
                  onClick={() => remove.mutate(attachment.id)}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
