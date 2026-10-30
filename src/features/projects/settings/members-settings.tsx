import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { IconPlus, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { useActiveUsers, useTeams } from '@/features/admin/api'
import { apiErrorMessage } from '@/shared/api/errors'
import { toast } from '@/shared/notify/toast'
import {
  roleLabels,
  useProjectMembers,
  useSetMembers,
  useSetTeams,
  type Project,
  type ProjectRole,
} from '../api'

const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({ value, label }))

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
    <Select
      size="xs"
      w={170}
      aria-label={label}
      value={value}
      onChange={(role) => role && onChange(role as ProjectRole)}
      allowDeselect={false}
      data={roleOptions}
    />
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
  const [newUserId, setNewUserId] = useState<string | null>(null)
  const [newTeamId, setNewTeamId] = useState<string | null>(null)

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
    <Stack gap="xl" maw={768}>
      <Stack gap="sm">
        <Title order={5}>Membros diretos</Title>
        <Paper withBorder radius="md">
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Pessoa</Table.Th>
                <Table.Th>Papel</Table.Th>
                <Table.Th w={40}>
                  <span className="visually-hidden">Remover</span>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {direct.map((member) => (
                <Table.Tr key={member.user.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {member.user.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {member.user.email}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <RoleSelect
                      value={member.role}
                      label={`Papel de ${member.user.name}`}
                      onChange={(role) =>
                        saveMembers(
                          directList.map((m) => (m.userId === member.user.id ? { ...m, role } : m)),
                        )
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label={`Remover ${member.user.name}`}
                      onClick={() =>
                        saveMembers(directList.filter((m) => m.userId !== member.user.id))
                      }
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
        <Group gap="xs">
          <Select
            w={260}
            aria-label="Pessoa para adicionar"
            placeholder="Adicionar pessoa…"
            searchable
            value={newUserId}
            onChange={setNewUserId}
            data={candidates.map((user) => ({ value: user.id, label: user.name }))}
          />
          <Button
            variant="default"
            leftSection={<IconPlus size={16} />}
            disabled={!newUserId || setMembers.isPending}
            onClick={() => {
              if (!newUserId) return
              saveMembers([...directList, { userId: newUserId, role: 'DEVELOPER' }])
              setNewUserId(null)
            }}
          >
            Adicionar como desenvolvedor
          </Button>
        </Group>
      </Stack>

      <Stack gap="sm">
        <Title order={5}>Times</Title>
        <Text size="sm" c="dimmed">
          Todas as pessoas do time recebem o papel escolhido. Quem também é membro direto fica com o
          papel direto.
        </Text>
        {linkedTeams.map((team) => (
          <Paper key={team.id} withBorder radius="md" p="xs">
            <Group gap="sm" wrap="nowrap">
              <Text size="sm" fw={500} style={{ flex: 1 }}>
                {team.name}{' '}
                <Text span size="xs" c="dimmed" fw={400}>
                  ({team.memberCount} pessoas)
                </Text>
              </Text>
              <RoleSelect
                value={team.role}
                label={`Papel do time ${team.name}`}
                onChange={(role) =>
                  saveTeams(teamList.map((t) => (t.teamId === team.id ? { ...t, role } : t)))
                }
              />
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Desvincular ${team.name}`}
                onClick={() => saveTeams(teamList.filter((t) => t.teamId !== team.id))}
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}
        <Group gap="xs">
          <Select
            w={260}
            aria-label="Time para vincular"
            placeholder="Vincular time…"
            value={newTeamId}
            onChange={setNewTeamId}
            data={teamCandidates.map((team) => ({ value: team.id, label: team.name }))}
          />
          <Button
            variant="default"
            leftSection={<IconPlus size={16} />}
            disabled={!newTeamId || setTeams.isPending}
            onClick={() => {
              if (!newTeamId) return
              saveTeams([...teamList, { teamId: newTeamId, role: 'DEVELOPER' }])
              setNewTeamId(null)
            }}
          >
            Vincular como desenvolvedores
          </Button>
        </Group>
        {viaTeams.length > 0 && (
          <Group gap={6}>
            <Text size="sm" c="dimmed">
              Pelos times:
            </Text>
            {viaTeams.map((m) => (
              <Badge key={m.user.id} color="gray" variant="light" tt="none">
                {m.user.name} · {roleLabels[m.role]}
              </Badge>
            ))}
          </Group>
        )}
      </Stack>
    </Stack>
  )
}
