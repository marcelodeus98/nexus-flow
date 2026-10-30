import { Button, Code, Paper, Select, Stack, Table, Text } from '@mantine/core'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'

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
  'board.': 'Boards e regras',
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
    <Stack gap="sm">
      <Select
        aria-label="Tipo de ação"
        w={256}
        value={action}
        onChange={(value) => setAction(value ?? ALL)}
        allowDeselect={false}
        data={[
          { value: ALL, label: 'Todas as ações' },
          ...Object.entries(actionGroups).map(([value, label]) => ({ value, label })),
        ]}
      />
      <Paper withBorder radius="md">
        <Table verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={144}>Quando</Table.Th>
              <Table.Th>Quem</Table.Th>
              <Table.Th>Ação</Table.Th>
              <Table.Th>Detalhes</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((entry) => (
              <Table.Tr key={entry.id}>
                <Table.Td>
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    {new Date(entry.createdAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {entry.actor?.name ?? (entry.actor ? 'Pessoa removida' : 'Sistema')}
                  </Text>
                  {entry.ip && (
                    <Text size="xs" c="dimmed">
                      {entry.ip}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="xs" ff="monospace">
                    {entry.action}
                  </Text>
                </Table.Td>
                <Table.Td maw={384}>
                  <Code c="dimmed" style={{ wordBreak: 'break-all' }}>
                    <Text span size="xs" lineClamp={2}>
                      {entry.metadata ? JSON.stringify(entry.metadata) : '—'}
                    </Text>
                  </Code>
                </Table.Td>
              </Table.Tr>
            ))}
            {log.isSuccess && rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text size="sm" c="dimmed" ta="center" py="lg">
                    Nada registrado.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
      {log.isError && (
        <Text size="sm" c="red">
          {apiErrorMessage(log.error)}
        </Text>
      )}
      {log.hasNextPage && (
        <Button
          variant="default"
          w="fit-content"
          loading={log.isFetchingNextPage}
          onClick={() => void log.fetchNextPage()}
        >
          Carregar mais
        </Button>
      )}
    </Stack>
  )
}
