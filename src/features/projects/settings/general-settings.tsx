import {
  Button,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useState, type FormEvent } from 'react'
import { apiErrorMessage } from '@/shared/api/errors'
import { confirmDanger } from '@/shared/notify/confirm'
import { toast } from '@/shared/notify/toast'
import {
  useSetArchived,
  useUpdateProject,
  type EstimateView,
  type Methodology,
  type Project,
} from '../api'
import { estimateViewOptions, methodologyOptions } from '../options'

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

  function confirmArchive() {
    const verb = archived ? 'Desarquivar' : 'Arquivar'
    confirmDanger({
      title: `${verb} ${project.name}?`,
      message: archived
        ? 'Os membros voltam a poder editar cards e o board.'
        : 'Ninguém poderá criar, editar ou mover cards até o projeto ser desarquivado.',
      confirmLabel: verb,
      onConfirm: () =>
        archive.mutate(!archived, { onError: (error) => toast.error(apiErrorMessage(error)) }),
    })
  }

  return (
    <Stack gap="xl" maw={576}>
      <Stack component="form" gap="md" onSubmit={submit}>
        <TextInput
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          required
          disabled={archived}
        />
        <TextInput
          label="Chave"
          description="A chave não muda: está nos números e links dos cards."
          value={project.key}
          disabled
          styles={{ input: { fontFamily: 'monospace' } }}
        />
        <Textarea
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autosize
          minRows={3}
          disabled={archived}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Metodologia"
            value={methodology}
            onChange={(v) => v && setMethodology(v as Methodology)}
            allowDeselect={false}
            disabled={archived}
            data={methodologyOptions}
          />
          <Select
            label="Estimativa exibida"
            value={estimateView}
            onChange={(v) => v && setEstimateView(v as EstimateView)}
            allowDeselect={false}
            disabled={archived}
            data={estimateViewOptions}
          />
        </SimpleGrid>
        <Button type="submit" w="fit-content" loading={update.isPending} disabled={archived}>
          Salvar
        </Button>
      </Stack>

      <Paper withBorder radius="md" p="md">
        <Stack gap="xs">
          <Title order={5}>{archived ? 'Projeto arquivado' : 'Arquivar projeto'}</Title>
          <Text size="sm" c="dimmed">
            {archived
              ? 'O board está somente leitura. Desarquive para voltar a editar.'
              : 'O board fica somente leitura e o projeto vai para o fim da lista. Dá para desarquivar depois.'}
          </Text>
          <Button
            w="fit-content"
            size="xs"
            variant={archived ? 'default' : 'light'}
            color={archived ? undefined : 'red'}
            onClick={confirmArchive}
          >
            {archived ? 'Desarquivar' : 'Arquivar'}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
