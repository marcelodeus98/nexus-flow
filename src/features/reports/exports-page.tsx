import { DownloadIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/shared/api/errors'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { downloadExport, useExports, type ExportStatus } from './api'

const statusLabels: Record<ExportStatus, string> = {
  PENDING: 'Na fila',
  RUNNING: 'Gerando',
  DONE: 'Pronta',
  FAILED: 'Falhou',
}

// The user's own exports: produced by the worker, kept for 24 hours.
export function ExportsPage() {
  const exports = useExports()
  // Fixed when the page opens; enough to tell expired files apart.
  const [now] = useState(() => Date.now())
  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Minhas exportações</h1>
        <p className="text-sm text-muted-foreground">
          Os arquivos ficam disponíveis por 24 horas. Peça novas na aba Relatórios de cada projeto.
        </p>
      </div>
      <ul className="divide-y rounded-lg border bg-background">
        {exports.data?.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhuma exportação ainda.
          </li>
        )}
        {exports.data?.map((item) => {
          const expired = item.expiresAt !== null && Date.parse(item.expiresAt) < now
          return (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {item.fileName ??
                    (item.kind === 'TIME_ENTRIES' ? 'Horas registradas' : 'Estimado vs real')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString('pt-BR')} · {item.format}
                  {item.rowCount !== null && ` · ${item.rowCount} linhas`}
                </p>
              </div>
              <Badge
                variant={
                  item.status === 'FAILED'
                    ? 'destructive'
                    : item.status === 'DONE'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {expired ? 'Expirada' : statusLabels[item.status]}
              </Badge>
              {item.status === 'DONE' && !expired && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadExport(item.id).catch((error: unknown) =>
                      toast.error(apiErrorMessage(error)),
                    )
                  }
                >
                  <DownloadIcon /> Baixar
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
