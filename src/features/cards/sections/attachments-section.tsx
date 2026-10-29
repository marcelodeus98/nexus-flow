import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DownloadIcon, PaperclipIcon, Trash2Icon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { Button } from '@/shared/ui/button'
import { cardKeys } from '../api'

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
  const put = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: presigned.headers,
    body: file,
  })
  if (!put.ok) throw new Error(`Upload failed with ${put.status}`)
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
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Anexos</h3>
        {canEdit && enabled && (
          <>
            <Button
              size="xs"
              variant="ghost"
              className="ml-auto"
              disabled={uploading > 0}
              onClick={() => input.current?.click()}
            >
              <PaperclipIcon /> {uploading > 0 ? 'Enviando…' : 'Anexar arquivo'}
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
        )}
      </div>
      {list.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">
          {list.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate" title={attachment.fileName}>
                {attachment.fileName}
              </span>
              <span className="text-xs text-muted-foreground">{formatSize(attachment.size)}</span>
              {enabled && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Baixar ${attachment.fileName}`}
                  onClick={() => void download(attachment.id)}
                >
                  <DownloadIcon />
                </Button>
              )}
              {canEdit && (attachment.uploader?.id === userId || canModerate) && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Excluir ${attachment.fileName}`}
                  onClick={() => remove.mutate(attachment.id)}
                >
                  <Trash2Icon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
