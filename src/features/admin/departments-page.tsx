import {
  ActionIcon,
  Badge,
  Button,
  ColorInput,
  ColorSwatch,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { apiErrorMessage } from '@/shared/api/errors'
import { confirmDanger } from '@/shared/notify/confirm'
import { toast } from '@/shared/notify/toast'
import { useDeleteDepartment, useDepartments, useSaveDepartment, type Department } from './api'

export function DepartmentsPage() {
  const departments = useDepartments()
  const remove = useDeleteDepartment()
  // undefined: closed; null: creating; a department: editing.
  const [editing, setEditing] = useState<Department | null | undefined>(undefined)

  function confirmDelete(department: Department) {
    confirmDanger({
      title: `Excluir ${department.name}?`,
      message: `${
        department.userCount
          ? `${department.userCount} pessoa(s) ficarão sem departamento.`
          : 'Ninguém está neste departamento.'
      } O histórico de auditoria é mantido.`,
      onConfirm: () =>
        remove.mutate(department.id, {
          onSuccess: () => toast.success('Departamento excluído.'),
          onError: (error) => toast.error(apiErrorMessage(error)),
        }),
    })
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" gap="md">
        <Text size="sm" c="dimmed">
          Os departamentos indicam a origem e o destino dos cards. Os quatro padrão não podem ser
          excluídos.
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
          Novo departamento
        </Button>
      </Group>

      <Paper withBorder radius="md">
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Departamento</Table.Th>
              <Table.Th>Pessoas ativas</Table.Th>
              <Table.Th w={96}>
                <span className="visually-hidden">Ações</span>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {departments.data?.map((department) => (
              <Table.Tr key={department.id}>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <ColorSwatch color={department.color} size={12} />
                    <Text size="sm" fw={500}>
                      {department.name}
                    </Text>
                    {department.isSystem && (
                      <Badge color="gray" variant="light">
                        Padrão
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>{department.userCount}</Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label={`Editar ${department.name}`}
                      onClick={() => setEditing(department)}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                    {!department.isSystem && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label={`Excluir ${department.name}`}
                        onClick={() => confirmDelete(department)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
      {departments.isError && (
        <Text size="sm" c="red">
          {apiErrorMessage(departments.error)}
        </Text>
      )}

      {editing !== undefined && (
        <DepartmentDialog department={editing ?? undefined} onClose={() => setEditing(undefined)} />
      )}
    </Stack>
  )
}

function DepartmentDialog({
  department,
  onClose,
}: {
  department?: Department
  onClose: () => void
}) {
  const save = useSaveDepartment()
  const [name, setName] = useState(department?.name ?? '')
  const [color, setColor] = useState(department?.color ?? '#017A72')

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      { id: department?.id, name: name.trim(), color: color.toUpperCase() },
      {
        onSuccess: () => {
          toast.success(department ? 'Departamento atualizado.' : 'Departamento criado.')
          onClose()
        },
        onError: (error) =>
          toast.error(apiErrorMessage(error, { 409: 'Já existe um departamento com esse nome.' })),
      },
    )
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={department ? 'Editar departamento' : 'Novo departamento'}
    >
      <Stack component="form" gap="md" onSubmit={submit}>
        <TextInput
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={60}
          required
        />
        <ColorInput label="Cor" format="hex" value={color} onChange={setColor} />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={save.isPending}>
            Salvar
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
