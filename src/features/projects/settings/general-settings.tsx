import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/features/admin/form-field'
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
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import {
  methodologyLabels,
  useSetArchived,
  useUpdateProject,
  type EstimateView,
  type Methodology,
  type Project,
} from '../api'

export function GeneralSettings({ project }: { project: Project }) {
  const update = useUpdateProject(project)
  const archive = useSetArchived(project)
  const archived = project.status === 'ARCHIVED'
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [methodology, setMethodology] = useState(project.methodology)
  const [estimateView, setEstimateView] = useState(project.defaultEstimateView)

  function submit(event: FormEvent) {
    event.preventDefault()
    update.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        methodology,
        defaultEstimateView: estimateView,
      },
      {
        onSuccess: () => toast.success('Projeto atualizado.'),
        onError: (error) => toast.error(apiErrorMessage(error)),
      },
    )
  }

  return (
    <div className="max-w-xl space-y-8">
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Nome">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            required
            disabled={archived}
          />
        </FormField>
        <FormField label="Chave" hint="A chave não muda: está nos números e links dos cards.">
          <Input value={project.key} disabled className="font-mono" />
        </FormField>
        <FormField label="Descrição">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={archived}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Metodologia">
            <Select
              value={methodology}
              onValueChange={(v) => setMethodology(v as Methodology)}
              disabled={archived}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(methodologyLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Estimativa exibida">
            <Select
              value={estimateView}
              onValueChange={(v) => setEstimateView(v as EstimateView)}
              disabled={archived}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POINTS">Story points</SelectItem>
                <SelectItem value="HOURS">Horas</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <Button type="submit" disabled={update.isPending || archived}>
          Salvar
        </Button>
      </form>

      <div className="space-y-2 rounded-lg border p-4">
        <h3 className="font-medium">{archived ? 'Projeto arquivado' : 'Arquivar projeto'}</h3>
        <p className="text-sm text-muted-foreground">
          {archived
            ? 'O board está somente leitura. Desarquive para voltar a editar.'
            : 'O board fica somente leitura e o projeto vai para o fim da lista. Dá para desarquivar depois.'}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant={archived ? 'outline' : 'destructive'} size="sm">
              {archived ? 'Desarquivar' : 'Arquivar'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {archived ? 'Desarquivar' : 'Arquivar'} {project.name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {archived
                  ? 'Os membros voltam a poder editar cards e o board.'
                  : 'Ninguém poderá criar, editar ou mover cards até o projeto ser desarquivado.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                variant={archived ? 'default' : 'destructive'}
                onClick={() =>
                  archive.mutate(!archived, {
                    onError: (error) => toast.error(apiErrorMessage(error)),
                  })
                }
              >
                {archived ? 'Desarquivar' : 'Arquivar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
