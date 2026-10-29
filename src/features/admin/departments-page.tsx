import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
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
} from '@/shared/ui/alert-dialog'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { useDeleteDepartment, useDepartments, useSaveDepartment, type Department } from './api'
import { FormField } from './form-field'

export function DepartmentsPage() {
  const departments = useDepartments()
  const remove = useDeleteDepartment()
  // undefined: closed; null: creating; a department: editing.
  const [editing, setEditing] = useState<Department | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Department>()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Os departamentos indicam a origem e o destino dos cards. Os quatro padrão não podem ser
          excluídos.
        </p>
        <Button onClick={() => setEditing(null)}>
          <PlusIcon /> Novo departamento
        </Button>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Departamento</TableHead>
              <TableHead>Pessoas ativas</TableHead>
              <TableHead className="w-24">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.data?.map((department) => (
              <TableRow key={department.id}>
                <TableCell>
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: department.color }}
                      aria-hidden
                    />
                    {department.name}
                    {department.isSystem && <Badge variant="secondary">Padrão</Badge>}
                  </span>
                </TableCell>
                <TableCell>{department.userCount}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${department.name}`}
                    onClick={() => setEditing(department)}
                  >
                    <PencilIcon />
                  </Button>
                  {!department.isSystem && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Excluir ${department.name}`}
                      onClick={() => setDeleting(department)}
                    >
                      <Trash2Icon />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {departments.isError && (
        <p className="text-sm text-destructive">{apiErrorMessage(departments.error)}</p>
      )}

      {editing !== undefined && (
        <DepartmentDialog department={editing ?? undefined} onClose={() => setEditing(undefined)} />
      )}

      <AlertDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.userCount
                ? `${deleting.userCount} pessoa(s) ficarão sem departamento.`
                : 'Ninguém está neste departamento.'}{' '}
              O histórico de auditoria é mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleting) return
                remove.mutate(deleting.id, {
                  onSuccess: () => toast.success('Departamento excluído.'),
                  onError: (error) => toast.error(apiErrorMessage(error)),
                })
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
  const [color, setColor] = useState(department?.color ?? '#2563EB')

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{department ? 'Editar departamento' : 'Novo departamento'}</DialogTitle>
          </DialogHeader>
          <FormField label="Nome">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={60}
              required
            />
          </FormField>
          <FormField label="Cor">
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-16 p-1"
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
