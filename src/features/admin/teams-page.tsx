import {
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { IconPlus, IconUsers } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { apiErrorMessage } from '@/shared/api/errors'
import { confirmDanger } from '@/shared/notify/confirm'
import { toast } from '@/shared/notify/toast'
import {
  useActiveUsers,
  useDeleteTeam,
  useSaveTeam,
  useSetTeamMembers,
  useTeam,
  useTeams,
  type TeamSummary,
} from './api'

export function TeamsPage() {
  const teams = useTeams()
  // undefined: closed; null: creating; a team: editing.
  const [editing, setEditing] = useState<TeamSummary | null | undefined>(undefined)

  return (
    <Stack gap="md">
      <Group justify="space-between" gap="md">
        <Text size="sm" c="dimmed">
          Times agrupam pessoas para associá-las a projetos de uma vez.
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
          Novo time
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {teams.data?.map((team) => (
          <Card key={team.id} withBorder radius="md" padding="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap={4}>
                <Title order={4}>{team.name}</Title>
                {team.description && (
                  <Text size="sm" c="dimmed">
                    {team.description}
                  </Text>
                )}
                <Group gap={4}>
                  <IconUsers size={14} aria-hidden color="var(--nexa-slate)" />
                  <Text size="sm" c="dimmed">
                    {team.memberCount === 1 ? '1 pessoa' : `${team.memberCount} pessoas`}
                  </Text>
                </Group>
              </Stack>
              <Button variant="default" size="xs" onClick={() => setEditing(team)}>
                Gerenciar
              </Button>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
      {teams.isSuccess && teams.data.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          Nenhum time criado ainda.
        </Text>
      )}
      {teams.isError && (
        <Text size="sm" c="red">
          {apiErrorMessage(teams.error)}
        </Text>
      )}

      {editing !== undefined && (
        <TeamDialog teamId={editing?.id} onClose={() => setEditing(undefined)} />
      )}
    </Stack>
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

  function confirmDelete(id: string) {
    confirmDanger({
      title: `Excluir ${currentName}?`,
      message: 'As pessoas continuam no sistema; só o agrupamento é removido.',
      onConfirm: () =>
        remove.mutate(id, {
          onSuccess: () => {
            toast.success('Time excluído.')
            onClose()
          },
          onError: (error) => toast.error(apiErrorMessage(error)),
        }),
    })
  }

  return (
    <Modal opened onClose={onClose} title={teamId ? 'Gerenciar time' : 'Novo time'} size="lg">
      <Stack component="form" gap="md" onSubmit={(event) => void submit(event)}>
        {teamId && team.isPending && (
          <Text size="sm" c="dimmed">
            Carregando…
          </Text>
        )}
        <TextInput
          label="Nome"
          value={currentName}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={80}
          required
        />
        <Textarea
          label="Descrição"
          value={currentDescription}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          autosize
          minRows={2}
        />

        {teamId && (
          <Stack gap="xs" component="fieldset" style={{ border: 0, padding: 0, margin: 0 }}>
            <Text component="legend" size="sm" fw={500}>
              Membros ({currentMembers.size})
            </Text>
            <TextInput
              type="search"
              placeholder="Filtrar pessoas"
              aria-label="Filtrar pessoas"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <ScrollArea.Autosize mah={256} type="auto">
              <Stack gap={6} p="xs">
                {visibleUsers.map((user) => (
                  <Checkbox
                    key={user.id}
                    checked={currentMembers.has(user.id)}
                    onChange={(e) => toggle(user.id, e.currentTarget.checked)}
                    label={user.name}
                    description={user.email}
                  />
                ))}
              </Stack>
            </ScrollArea.Autosize>
          </Stack>
        )}

        <Group justify="space-between" mt="sm">
          {teamId ? (
            <Button variant="light" color="red" onClick={() => confirmDelete(teamId)}>
              Excluir time
            </Button>
          ) : (
            <span />
          )}
          <Group gap="xs">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending} disabled={Boolean(teamId) && team.isPending}>
              Salvar
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}
