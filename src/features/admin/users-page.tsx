import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  ColorSwatch,
  Group,
  Menu,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core'
import { IconDots, IconPlus, IconSearch } from '@tabler/icons-react'
import { useDeferredValue, useState } from 'react'
import { apiErrorMessage } from '@/shared/api/errors'
import { useSessionState } from '@/shared/auth/session-store'
import { toast } from '@/shared/notify/toast'
import { useSetUserStatus, useUsers, type User } from './api'
import { UserDialog } from './user-dialog'

export function UsersPage() {
  const session = useSessionState()
  const currentUserId = session.status === 'authenticated' ? session.session.user.id : undefined
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const filters = { search: useDeferredValue(search.trim()), includeInactive }
  const users = useUsers(filters)
  const setStatus = useSetUserStatus()
  // undefined: closed; null: creating; a user: editing.
  const [editing, setEditing] = useState<User | null | undefined>(undefined)

  const rows = users.data?.pages.flatMap((page) => page.items) ?? []

  function toggleStatus(user: User) {
    setStatus.mutate(
      { id: user.id, isActive: !user.isActive },
      {
        onSuccess: () =>
          toast.success(
            user.isActive ? `${user.name} foi desativado.` : `${user.name} foi reativado.`,
          ),
        onError: (error) => toast.error(apiErrorMessage(error)),
      },
    )
  }

  const message = (text: string) => (
    <Table.Tr>
      <Table.Td colSpan={5}>
        <Text size="sm" c="dimmed" ta="center" py="lg">
          {text}
        </Text>
      </Table.Td>
    </Table.Tr>
  )

  return (
    <Stack gap="md">
      <Group gap="md">
        <TextInput
          type="search"
          placeholder="Buscar por nome ou e-mail"
          aria-label="Buscar usuários"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          w={320}
        />
        <Checkbox
          label="Mostrar desativados"
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.currentTarget.checked)}
        />
        <Button ml="auto" leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
          Novo usuário
        </Button>
      </Group>

      <Paper withBorder radius="md">
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Departamento</Table.Th>
              <Table.Th>Papel</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th w={48}>
                <span className="visually-hidden">Ações</span>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((user) => (
              <Table.Tr key={user.id} opacity={user.isActive ? 1 : 0.6}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {user.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {user.email}
                    {user.jobTitle && ` · ${user.jobTitle}`}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {user.department ? (
                    <Group gap="xs" wrap="nowrap">
                      <ColorSwatch color={user.department.color} size={10} />
                      <Text size="sm">{user.department.name}</Text>
                    </Group>
                  ) : (
                    <Text c="dimmed">—</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  {user.globalRole === 'ADMIN' ? (
                    <Badge>Administrador</Badge>
                  ) : (
                    <Badge color="gray" variant="light">
                      Usuário
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>{user.isActive ? 'Ativo' : 'Desativado'}</Table.Td>
                <Table.Td>
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label={`Ações de ${user.name}`}
                      >
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item onClick={() => setEditing(user)}>Editar</Menu.Item>
                      {user.id !== currentUserId && (
                        <Menu.Item
                          color={user.isActive ? 'red' : undefined}
                          onClick={() => toggleStatus(user)}
                        >
                          {user.isActive ? 'Desativar' : 'Reativar'}
                        </Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            ))}
            {users.isSuccess && rows.length === 0 && message('Nenhum usuário encontrado.')}
            {users.isPending && message('Carregando…')}
          </Table.Tbody>
        </Table>
      </Paper>

      {users.hasNextPage && (
        <Button
          variant="default"
          w="fit-content"
          onClick={() => void users.fetchNextPage()}
          loading={users.isFetchingNextPage}
        >
          Carregar mais
        </Button>
      )}
      {users.isError && (
        <Text size="sm" c="red">
          {apiErrorMessage(users.error)}
        </Text>
      )}

      {editing !== undefined && (
        <UserDialog
          user={editing ?? undefined}
          isSelf={editing?.id === currentUserId}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Stack>
  )
}
