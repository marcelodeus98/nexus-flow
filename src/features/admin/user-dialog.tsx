import {
  Button,
  Group,
  Modal,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { useState, type FormEvent } from 'react'
import { apiErrorMessage } from '@/shared/api/errors'
import { toast } from '@/shared/notify/toast'
import { useDepartments, useSaveUser, type GlobalRole, type User } from './api'

const roleOptions = [
  { value: 'USER', label: 'Usuário' },
  { value: 'ADMIN', label: 'Administrador' },
]

export function UserDialog({
  user,
  isSelf,
  onClose,
}: {
  // Undefined creates a new user.
  user?: User
  isSelf: boolean
  onClose: () => void
}) {
  const departments = useDepartments()
  const save = useSaveUser()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '')
  const [departmentId, setDepartmentId] = useState<string | null>(user?.departmentId ?? null)
  const [globalRole, setGlobalRole] = useState<GlobalRole>(user?.globalRole ?? 'USER')
  const [password, setPassword] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      {
        id: user?.id,
        name: name.trim(),
        email: email.trim(),
        jobTitle: jobTitle.trim() || null,
        departmentId,
        // The API refuses an admin changing their own role; don't send it.
        ...(!isSelf && { globalRole }),
        ...(!user && password && { password }),
      },
      {
        onSuccess: () => {
          toast.success(user ? 'Usuário atualizado.' : 'Usuário cadastrado.')
          onClose()
        },
        onError: (error) =>
          toast.error(apiErrorMessage(error, { 409: 'Esse e-mail já está em uso.' })),
      },
    )
  }

  return (
    <Modal opened onClose={onClose} title={user ? 'Editar usuário' : 'Novo usuário'}>
      <Stack component="form" gap="md" onSubmit={submit}>
        <Text size="sm" c="dimmed">
          {user
            ? 'As mudanças de papel valem a partir do próximo acesso (até 15 minutos).'
            : 'Sem senha inicial, a pessoa define a sua em "Esqueci minha senha".'}
        </Text>
        <TextInput
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          required
        />
        <TextInput
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextInput label="Cargo" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Departamento"
            placeholder="Nenhum"
            clearable
            value={departmentId}
            onChange={setDepartmentId}
            data={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
          />
          <Select
            label="Papel"
            description={isSelf ? 'Você não pode mudar o próprio papel.' : undefined}
            value={globalRole}
            onChange={(value) => value && setGlobalRole(value as GlobalRole)}
            disabled={isSelf}
            allowDeselect={false}
            data={roleOptions}
          />
        </SimpleGrid>
        {!user && (
          <PasswordInput
            label="Senha inicial (opcional)"
            description="Mínimo de 8 caracteres."
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            maxLength={128}
          />
        )}
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
