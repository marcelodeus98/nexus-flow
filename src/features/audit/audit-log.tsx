import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { Button } from '@/shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

type Entry = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  projectId: string | null
  ip: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  actor: { id: string; name: string | null } | null
}

const actionGroups: Record<string, string> = {
  'auth.': 'Acesso (login, senha)',
  'user.': 'Usuários',
  'project.': 'Projeto e membros',
  'card.': 'Cards',
  'time.': 'Tempo',
  'sprint.': 'Sprints',
  'column.': 'Colunas',
  'board.': 'Regras do board',
  'comment.': 'Comentários',
  'attachment.': 'Anexos',
  'department.': 'Departamentos',
  'team.': 'Times',
  'tag.': 'Tags',
}

const ALL = 'all'

// The audit log, newest first: admins see everything (/audit), a project's
// managers its slice (/projects/:id/audit).
export function AuditLog({ source }: { source: string }) {
  const [action, setAction] = useState(ALL)
  const log = useInfiniteQuery({
    queryKey: ['audit', source, action],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' })
      if (action !== ALL) params.set('action', action)
      if (pageParam) params.set('cursor', pageParam)
      return http<{ items: Entry[]; nextCursor: string | null }>(`${source}?${params.toString()}`)
    },
    initialPageParam: '',
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
  const rows = log.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="space-y-3">
      <Select value={action} onValueChange={setAction}>
        <SelectTrigger className="w-64 bg-background" aria-label="Tipo de ação">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as ações</SelectItem>
          {Object.entries(actionGroups).map(([prefix, label]) => (
            <SelectItem key={prefix} value={prefix}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Quando</TableHead>
              <TableHead>Quem</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                  {new Date(entry.createdAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell>
                  {entry.actor?.name ?? (entry.actor ? 'Pessoa removida' : 'Sistema')}
                  {entry.ip && (
                    <span className="block text-xs text-muted-foreground">{entry.ip}</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                <TableCell className="max-w-96">
                  <code className="line-clamp-2 text-xs break-all text-muted-foreground">
                    {entry.metadata ? JSON.stringify(entry.metadata) : '—'}
                  </code>
                </TableCell>
              </TableRow>
            ))}
            {log.isSuccess && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nada registrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {log.isError && <p className="text-sm text-destructive">{apiErrorMessage(log.error)}</p>}
      {log.hasNextPage && (
        <Button
          variant="outline"
          disabled={log.isFetchingNextPage}
          onClick={() => void log.fetchNextPage()}
        >
          Carregar mais
        </Button>
      )}
    </div>
  )
}
