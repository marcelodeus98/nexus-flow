import { FolderKanbanIcon, PlusIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { FormField } from '@/features/admin/form-field'
import { apiErrorMessage } from '@/shared/api/errors'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
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
import { Textarea } from '@/shared/ui/textarea'
import {
  methodologyLabels,
  roleLabels,
  useCreateProject,
  useProjects,
  type EstimateView,
  type Methodology,
} from './api'

export function ProjectsPage() {
  const projects = useProjects()
  const [creating, setCreating] = useState(false)
  const active = projects.data?.filter((p) => p.status === 'ACTIVE') ?? []
  const archived = projects.data?.filter((p) => p.status === 'ARCHIVED') ?? []

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Projetos</h1>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon /> Novo projeto
        </Button>
      </div>

      {projects.isPending && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {projects.isError && (
        <p className="text-sm text-destructive">{apiErrorMessage(projects.error)}</p>
      )}
      {projects.isSuccess && projects.data.length === 0 && (
        <div className="rounded-lg border border-dashed bg-background p-10 text-center">
          <FolderKanbanIcon className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-medium">Nenhum projeto ainda</p>
          <p className="text-sm text-muted-foreground">
            Crie um projeto ou peça para ser adicionado a um.
          </p>
        </div>
      )}

      <ProjectGrid projects={active} />
      {archived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Arquivados</h2>
          <ProjectGrid projects={archived} />
        </div>
      )}

      {creating && <CreateProjectDialog onClose={() => setCreating(false)} />}
    </section>
  )
}

function ProjectGrid({
  projects,
}: {
  projects: NonNullable<ReturnType<typeof useProjects>['data']>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          to={`/p/${project.key}`}
          className="rounded-xl focus-visible:outline-2"
        >
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {project.key}
                </span>
                <span className="truncate">{project.name}</span>
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span>{methodologyLabels[project.methodology]}</span>
                {project.myRole && <Badge variant="secondary">{roleLabels[project.myRole]}</Badge>}
              </CardDescription>
              {project.description && (
                <CardDescription className="line-clamp-2">{project.description}</CardDescription>
              )}
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function CreateProjectDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const create = useCreateProject()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyTouched, setKeyTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [methodology, setMethodology] = useState<Methodology>('KANBAN')
  const [estimateView, setEstimateView] = useState<EstimateView>('POINTS')

  // Suggests a key from the name until the user types one.
  const suggestedKey = name
    .normalize('NFD')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase()
  const currentKey = keyTouched ? key : suggestedKey

  function submit(event: FormEvent) {
    event.preventDefault()
    create.mutate(
      {
        key: currentKey,
        name: name.trim(),
        description: description.trim() || undefined,
        methodology,
        defaultEstimateView: estimateView,
      },
      {
        onSuccess: (project) => {
          toast.success('Projeto criado.')
          void navigate(`/p/${project.key}`)
        },
        onError: (error) =>
          toast.error(apiErrorMessage(error, { 409: 'Essa chave já está em uso.' })),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Novo projeto</DialogTitle>
            <DialogDescription>Você será o gestor do projeto.</DialogDescription>
          </DialogHeader>
          <FormField label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          </FormField>
          <FormField
            label="Chave"
            hint={`Prefixo dos cards: ${currentKey || 'NEXA'}-123. Não muda depois.`}
          >
            <Input
              value={currentKey}
              onChange={(e) => {
                setKeyTouched(true)
                setKey(e.target.value.toUpperCase())
              }}
              pattern="[A-Za-z][A-Za-z0-9]{1,9}"
              title="2 a 10 letras ou números, começando com letra"
              className="font-mono uppercase"
              required
            />
          </FormField>
          <FormField label="Descrição">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Metodologia">
              <Select value={methodology} onValueChange={(v) => setMethodology(v as Methodology)}>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Criar projeto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
