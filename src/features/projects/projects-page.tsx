import {
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { IconLayoutKanban, IconPlus } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '@/shared/api/errors'
import { toast } from '@/shared/notify/toast'
import {
  methodologyLabels,
  roleLabels,
  useCreateProject,
  useProjects,
  type EstimateView,
  type Methodology,
} from './api'
import { estimateViewOptions, methodologyOptions } from './options'
import './projects-page.css'

export function ProjectsPage() {
  const projects = useProjects()
  const [creating, setCreating] = useState(false)
  const active = projects.data?.filter((p) => p.status === 'ACTIVE') ?? []
  const archived = projects.data?.filter((p) => p.status === 'ARCHIVED') ?? []

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Projetos</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
          Novo projeto
        </Button>
      </Group>

      {projects.isPending && (
        <Text size="sm" c="dimmed">
          Carregando…
        </Text>
      )}
      {projects.isError && (
        <Text size="sm" c="red">
          {apiErrorMessage(projects.error)}
        </Text>
      )}
      {projects.isSuccess && projects.data.length === 0 && (
        <Card withBorder radius="md" p="xl" className="projects-page__empty">
          <Stack align="center" gap="xs">
            <ThemeIcon size={48} radius="xl" variant="light">
              <IconLayoutKanban size={24} />
            </ThemeIcon>
            <Text fw={600}>Nenhum projeto ainda</Text>
            <Text size="sm" c="dimmed">
              Crie um projeto ou peça para ser adicionado a um.
            </Text>
          </Stack>
        </Card>
      )}

      <ProjectGrid projects={active} />
      {archived.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" fw={500} c="dimmed">
            Arquivados
          </Text>
          <ProjectGrid projects={archived} />
        </Stack>
      )}

      {creating && <CreateProjectDialog onClose={() => setCreating(false)} />}
    </Stack>
  )
}

function ProjectGrid({
  projects,
}: {
  projects: NonNullable<ReturnType<typeof useProjects>['data']>
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
      {projects.map((project) => (
        <Card
          key={project.id}
          component={Link}
          to={`/p/${project.key}`}
          withBorder
          radius="md"
          padding="lg"
          className="projects-page__card"
        >
          <Group gap="xs" wrap="nowrap">
            <Badge variant="light" radius="sm" ff="monospace">
              {project.key}
            </Badge>
            <Text fw={600} truncate>
              {project.name}
            </Text>
          </Group>
          <Group gap="xs" mt="xs">
            <Text size="sm" c="dimmed">
              {methodologyLabels[project.methodology]}
            </Text>
            {project.myRole && (
              <Badge color="navy" variant="light" size="sm">
                {roleLabels[project.myRole]}
              </Badge>
            )}
          </Group>
          {project.description && (
            <Text size="sm" c="dimmed" mt="xs" lineClamp={2}>
              {project.description}
            </Text>
          )}
        </Card>
      ))}
    </SimpleGrid>
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
  const [qaFlow, setQaFlow] = useState(false)

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
        qaFlow,
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
    <Modal opened onClose={onClose} title="Novo projeto">
      <Stack component="form" gap="md" onSubmit={submit}>
        <Text size="sm" c="dimmed">
          Você será o gestor do projeto.
        </Text>
        <TextInput
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          required
        />
        <TextInput
          label="Chave"
          description={`Prefixo dos cards: ${currentKey || 'NEXA'}-123. Não muda depois.`}
          value={currentKey}
          onChange={(e) => {
            setKeyTouched(true)
            setKey(e.target.value.toUpperCase())
          }}
          pattern="[A-Za-z][A-Za-z0-9]{1,9}"
          title="2 a 10 letras ou números, começando com letra"
          styles={{ input: { fontFamily: 'monospace' } }}
          required
        />
        <Textarea
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autosize
          minRows={2}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Metodologia"
            value={methodology}
            onChange={(v) => v && setMethodology(v as Methodology)}
            allowDeselect={false}
            data={methodologyOptions}
          />
          <Select
            label="Estimativa exibida"
            value={estimateView}
            onChange={(v) => v && setEstimateView(v as EstimateView)}
            allowDeselect={false}
            data={estimateViewOptions}
          />
        </SimpleGrid>
        <Checkbox
          label="Fluxo de QA"
          description='Cria a coluna "Em teste" e só deixa ir para Concluído o card aprovado pelo QA.'
          checked={qaFlow}
          onChange={(e) => setQaFlow(e.currentTarget.checked)}
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={create.isPending}>
            Criar projeto
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
