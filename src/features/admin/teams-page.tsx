import { PlusIcon, UsersIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/shared/api/errors'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import {
  useActiveUsers,
  useDeleteTeam,
  useSaveTeam,
  useSetTeamMembers,
  useTeam,
  useTeams,
  type TeamSummary,
} from './api'
import { FormField } from './form-field'

export function TeamsPage() {
  const teams = useTeams()
  // undefined: closed; null: creating; a team: editing.
  const [editing, setEditing] = useState<TeamSummary | null | undefined>(undefined)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Times agrupam pessoas para associá-las a projetos de uma vez.
        </p>
        <Button onClick={() => setEditing(null)}>
          <PlusIcon /> Novo time
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {teams.data?.map((team) => (
          <Card key={team.id} size="sm">
            <CardHeader>
              <CardTitle>{team.name}</CardTitle>
              <CardDescription>
                {team.description && <span className="block">{team.description}</span>}
                <span className="inline-flex items-center gap-1">
                  <UsersIcon className="size-3.5" aria-hidden />
                  {team.memberCount === 1 ? '1 pessoa' : `${team.memberCount} pessoas`}
                </span>
              </CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => setEditing(team)}>
                  Gerenciar
                </Button>
              </CardAction>
            </CardHeader>
          </Card>
        ))}
      </div>
      {teams.isSuccess && teams.data.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum time criado ainda.</p>
      )}
      {teams.isError && <p className="text-sm text-destructive">{apiErrorMessage(teams.error)}</p>}

      {editing !== undefined && (
        <TeamDialog teamId={editing?.id} onClose={() => setEditing(undefined)} />
      )}
    </div>
  )
}

// Creating asks only for name and description; editing also manages members.
function TeamDialog({ teamId, onClose }: { teamId?: string; onClose: () => void }) {
  const team = useTeam(teamId)
  const users = useActiveUsers()
  const save = useSaveTeam()
  const setMembers = useSetTeamMembers()
  const remove = useDeleteTeam()
  const [name, setName] = useState<string>()
  const [description, setDescription] = useState<string>()
  const [memberIds, setMemberIds] = useState<Set<string>>()
  const [filter, setFilter] = useState('')

  // Fields follow the loaded team until the admin edits them.
  const currentName = name ?? team.data?.name ?? ''
  const currentDescription = description ?? team.data?.description ?? ''
  const currentMembers = memberIds ?? new Set(team.data?.members.map((member) => member.id))
  const visibleUsers = (users.data ?? []).filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(filter.trim().toLowerCase()),
  )

  function toggle(userId: string, checked: boolean) {
    const next = new Set(currentMembers)
    if (checked) next.add(userId)
    else next.delete(userId)
    setMemberIds(next)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const saved = await save.mutateAsync({
        id: teamId,
        name: currentName.trim(),
        description: currentDescription.trim() || null,
      })
      if (teamId && memberIds) {
        await setMembers.mutateAsync({ id: saved.id, userIds: [...memberIds] })
      }
      toast.success(teamId ? 'Time atualizado.' : 'Time criado. Agora adicione as pessoas.')
      onClose()
    } catch (error) {
      toast.error(apiErrorMessage(error, { 409: 'Já existe um time com esse nome.' }))
    }
  }

  const pending = save.isPending || setMembers.isPending

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{teamId ? 'Gerenciar time' : 'Novo time'}</DialogTitle>
            {teamId && team.isPending && <DialogDescription>Carregando…</DialogDescription>}
          </DialogHeader>
          <FormField label="Nome">
            <Input
              value={currentName}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
          </FormField>
          <FormField label="Descrição">
            <Textarea
              value={currentDescription}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </FormField>

          {teamId && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Membros ({currentMembers.size})</legend>
              <Input
                type="search"
                placeholder="Filtrar pessoas"
                aria-label="Filtrar pessoas"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
                {visibleUsers.map((user) => (
                  <li key={user.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted">
                      <Checkbox
                        checked={currentMembers.has(user.id)}
                        onCheckedChange={(checked) => toggle(user.id, checked === true)}
                      />
                      <span className="text-sm">
                        {user.name}
                        <span className="block text-xs text-muted-foreground">{user.email}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          <DialogFooter className="sm:justify-between">
            {teamId ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
                    Excluir time
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {currentName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      As pessoas continuam no sistema; só o agrupamento é removido.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() =>
                        remove.mutate(teamId, {
                          onSuccess: () => {
                            toast.success('Time excluído.')
                            onClose()
                          },
                          onError: (error) => toast.error(apiErrorMessage(error)),
                        })
                      }
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || (Boolean(teamId) && team.isPending)}>
                {pending ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
