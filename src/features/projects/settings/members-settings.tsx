import { PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useActiveUsers, useTeams } from '@/features/admin/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import {
  roleLabels,
  useProjectMembers,
  useSetMembers,
  useSetTeams,
  type Project,
  type ProjectRole,
} from '../api'

const roles = Object.keys(roleLabels) as ProjectRole[]

function RoleSelect({
  value,
  onChange,
  label,
}: {
  value: ProjectRole
  onChange: (role: ProjectRole) => void
  label: string
}) {
  return (
    <Select value={value} onValueChange={(role) => onChange(role as ProjectRole)}>
      <SelectTrigger size="sm" className="w-40" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role} value={role}>
            {roleLabels[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Members are saved as a whole list (PUT). The API refuses a list that would
// leave the project without a manager.
export function MembersSettings({ project }: { project: Project }) {
  const members = useProjectMembers(project.id)
  const users = useActiveUsers()
  const teams = useTeams()
  const setMembers = useSetMembers(project.id)
  const setTeams = useSetTeams(project.id)
  const [newUserId, setNewUserId] = useState<string>()
  const [newTeamId, setNewTeamId] = useState<string>()

  const direct = (members.data?.members ?? []).filter((m) => m.direct)
  const viaTeams = (members.data?.members ?? []).filter((m) => !m.direct)
  const linkedTeams = members.data?.teams ?? []
  const onError = (error: unknown) =>
    toast.error(apiErrorMessage(error, { 400: 'O projeto precisa de pelo menos um gestor.' }))

  const saveMembers = (list: { userId: string; role: ProjectRole }[]) =>
    setMembers.mutate(list, { onError })
  const saveTeams = (list: { teamId: string; role: ProjectRole }[]) =>
    setTeams.mutate(list, { onError })

  const directList = direct.map((m) => ({ userId: m.user.id, role: m.role }))
  const teamList = linkedTeams.map((t) => ({ teamId: t.id, role: t.role }))
  const candidates = (users.data ?? []).filter((u) => !direct.some((m) => m.user.id === u.id))
  const teamCandidates = (teams.data ?? []).filter((t) => !linkedTeams.some((l) => l.id === t.id))

  return (
    <div className="max-w-3xl space-y-8">
      <section className="space-y-3">
        <h3 className="font-medium">Membros diretos</h3>
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Remover</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {direct.map((member) => (
                <TableRow key={member.user.id}>
                  <TableCell>
                    <div className="font-medium">{member.user.name}</div>
                    <div className="text-xs text-muted-foreground">{member.user.email}</div>
                  </TableCell>
                  <TableCell>
                    <RoleSelect
                      value={member.role}
                      label={`Papel de ${member.user.name}`}
                      onChange={(role) =>
                        saveMembers(
                          directList.map((m) => (m.userId === member.user.id ? { ...m, role } : m)),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover ${member.user.name}`}
                      onClick={() =>
                        saveMembers(directList.filter((m) => m.userId !== member.user.id))
                      }
                    >
                      <XIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={newUserId ?? ''} onValueChange={setNewUserId}>
            <SelectTrigger className="w-64" aria-label="Pessoa para adicionar">
              <SelectValue placeholder="Adicionar pessoa…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={!newUserId || setMembers.isPending}
            onClick={() => {
              if (!newUserId) return
              saveMembers([...directList, { userId: newUserId, role: 'DEVELOPER' }])
              setNewUserId(undefined)
            }}
          >
            <PlusIcon /> Adicionar como desenvolvedor
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">Times</h3>
        <p className="text-sm text-muted-foreground">
          Todas as pessoas do time recebem o papel escolhido. Quem também é membro direto fica com o
          papel direto.
        </p>
        <ul className="space-y-2">
          {linkedTeams.map((team) => (
            <li
              key={team.id}
              className="flex items-center gap-3 rounded-lg border bg-background p-2"
            >
              <span className="flex-1 font-medium">
                {team.name}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({team.memberCount} pessoas)
                </span>
              </span>
              <RoleSelect
                value={team.role}
                label={`Papel do time ${team.name}`}
                onChange={(role) =>
                  saveTeams(teamList.map((t) => (t.teamId === team.id ? { ...t, role } : t)))
                }
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Desvincular ${team.name}`}
                onClick={() => saveTeams(teamList.filter((t) => t.teamId !== team.id))}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Select value={newTeamId ?? ''} onValueChange={setNewTeamId}>
            <SelectTrigger className="w-64" aria-label="Time para vincular">
              <SelectValue placeholder="Vincular time…" />
            </SelectTrigger>
            <SelectContent>
              {teamCandidates.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={!newTeamId || setTeams.isPending}
            onClick={() => {
              if (!newTeamId) return
              saveTeams([...teamList, { teamId: newTeamId, role: 'DEVELOPER' }])
              setNewTeamId(undefined)
            }}
          >
            <PlusIcon /> Vincular como desenvolvedores
          </Button>
        </div>
        {viaTeams.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Pelos times:{' '}
            {viaTeams.map((m, i) => (
              <span key={m.user.id}>
                {i > 0 && ', '}
                {m.user.name} <Badge variant="secondary">{roleLabels[m.role]}</Badge>
              </span>
            ))}
          </p>
        )}
      </section>
    </div>
  )
}
