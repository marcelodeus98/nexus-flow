import { MoreHorizontalIcon, PlusIcon } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/shared/api/errors'
import { useSessionState } from '@/shared/auth/session-store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Buscar por nome ou e-mail"
          aria-label="Buscar usuários"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="include-inactive"
            checked={includeInactive}
            onCheckedChange={(checked) => setIncludeInactive(checked === true)}
          />
          <Label htmlFor="include-inactive">Mostrar desativados</Label>
        </div>
        <Button className="ml-auto" onClick={() => setEditing(null)}>
          <PlusIcon /> Novo usuário
        </Button>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((user) => (
              <TableRow key={user.id} className={user.isActive ? undefined : 'opacity-60'}>
                <TableCell>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {user.email}
                    {user.jobTitle && ` · ${user.jobTitle}`}
                  </div>
                </TableCell>
                <TableCell>
                  {user.department ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: user.department.color }}
                        aria-hidden
                      />
                      {user.department.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.globalRole === 'ADMIN' ? (
                    <Badge>Administrador</Badge>
                  ) : (
                    <Badge variant="secondary">Usuário</Badge>
                  )}
                </TableCell>
                <TableCell>{user.isActive ? 'Ativo' : 'Desativado'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${user.name}`}>
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing(user)}>Editar</DropdownMenuItem>
                      {user.id !== currentUserId && (
                        <DropdownMenuItem
                          variant={user.isActive ? 'destructive' : 'default'}
                          onSelect={() => toggleStatus(user)}
                        >
                          {user.isActive ? 'Desativar' : 'Reativar'}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {users.isSuccess && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
            {users.isPending && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {users.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void users.fetchNextPage()}
          disabled={users.isFetchingNextPage}
        >
          Carregar mais
        </Button>
      )}
      {users.isError && <p className="text-sm text-destructive">{apiErrorMessage(users.error)}</p>}

      {editing !== undefined && (
        <UserDialog
          user={editing ?? undefined}
          isSelf={editing?.id === currentUserId}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  )
}
