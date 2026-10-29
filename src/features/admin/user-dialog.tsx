import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/shared/api/errors'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useDepartments, useSaveUser, type GlobalRole, type User } from './api'
import { FormField } from './form-field'

// Radix Select cannot hold an empty value.
const NO_DEPARTMENT = 'none'

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
  const [departmentId, setDepartmentId] = useState(user?.departmentId ?? NO_DEPARTMENT)
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
        departmentId: departmentId === NO_DEPARTMENT ? null : departmentId,
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{user ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
            <DialogDescription>
              {user
                ? 'As mudanças de papel valem a partir do próximo acesso (até 15 minutos).'
                : 'Sem senha inicial, a pessoa entra com Google ou usa "Esqueci minha senha".'}
            </DialogDescription>
          </DialogHeader>

          <FormField label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          </FormField>
          <FormField label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <FormField label="Cargo">
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Departamento">
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEPARTMENT}>Nenhum</SelectItem>
                  {departments.data?.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label="Papel"
              hint={isSelf ? 'Você não pode mudar o próprio papel.' : undefined}
            >
              <Select
                value={globalRole}
                onValueChange={(value) => setGlobalRole(value as GlobalRole)}
                disabled={isSelf}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Usuário</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          {!user && (
            <FormField label="Senha inicial (opcional)" hint="Mínimo de 8 caracteres.">
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={128}
              />
            </FormField>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
