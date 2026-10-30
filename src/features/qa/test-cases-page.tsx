import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { IconArrowDown, IconArrowUp, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'
import { useDeferredValue, useState, type FormEvent } from 'react'
import { useCan } from '@/features/projects/api'
import { useCurrentProject } from '@/features/projects/project-context'
import { apiErrorMessage } from '@/shared/api/errors'
import { toast } from '@/shared/notify/toast'
import { useSaveTestCase, useTestCases, type TestCase } from './test-cases-api'
import './test-cases-page.css'

// The project's test case library: reusable scripts QA attaches to cards and
// runs in each round. Everyone in the project reads it; QA, the product
// owner and managers keep it.
export function TestCasesPage() {
  const project = useCurrentProject()
  const can = useCan(project.key)
  const editable = project.status !== 'ARCHIVED' && can('card:validate')
  const [showArchived, setShowArchived] = useState(false)
  const cases = useTestCases(project.id, true, showArchived)
  const save = useSaveTestCase(project.id)
  const [search, setSearch] = useState('')
  const query = useDeferredValue(search.trim().toLowerCase())
  // undefined: closed; null: creating; a case: editing.
  const [editing, setEditing] = useState<TestCase | null | undefined>(undefined)

  const list = (cases.data ?? []).filter((c) => !query || c.title.toLowerCase().includes(query))

  return (
    <Stack gap="md">
      <Group gap="md">
        <TextInput
          w={320}
          type="search"
          placeholder="Buscar caso de teste"
          aria-label="Buscar caso de teste"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Switch
          label="Mostrar arquivados"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.currentTarget.checked)}
        />
        {editable && (
          <Button ml="auto" leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
            Novo caso de teste
          </Button>
        )}
      </Group>

      <Paper withBorder radius="md">
        {cases.isPending && (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            Carregando…
          </Text>
        )}
        {cases.isSuccess && list.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            {query ? 'Nenhum caso encontrado.' : 'Ainda não há casos de teste neste projeto.'}
          </Text>
        )}
        {list.length > 0 && (
          <ul className="test-cases">
            {list.map((testCase) => (
              <li key={testCase.id}>
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      {testCase.title}
                    </Text>
                    {testCase.archivedAt && (
                      <Badge size="xs" color="gray" variant="light">
                        Arquivado
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {testCase.steps.length === 1 ? '1 passo' : `${testCase.steps.length} passos`}
                    {testCase.preconditions && ` · pré-condições: ${testCase.preconditions}`}
                  </Text>
                </Stack>
                {editable && (
                  <Group gap="xs">
                    <Button size="xs" variant="default" onClick={() => setEditing(testCase)}>
                      Editar
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      onClick={() =>
                        save.mutate(
                          { id: testCase.id, archived: !testCase.archivedAt },
                          { onError: (error) => toast.error(apiErrorMessage(error)) },
                        )
                      }
                    >
                      {testCase.archivedAt ? 'Restaurar' : 'Arquivar'}
                    </Button>
                  </Group>
                )}
              </li>
            ))}
          </ul>
        )}
      </Paper>

      {editing !== undefined && (
        <TestCaseDialog
          projectId={project.id}
          testCase={editing ?? undefined}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Stack>
  )
}

type StepDraft = { action: string; expected: string }

function TestCaseDialog({
  projectId,
  testCase,
  onClose,
}: {
  projectId: string
  testCase?: TestCase
  onClose: () => void
}) {
  const save = useSaveTestCase(projectId)
  const [title, setTitle] = useState(testCase?.title ?? '')
  const [preconditions, setPreconditions] = useState(testCase?.preconditions ?? '')
  const [steps, setSteps] = useState<StepDraft[]>(
    testCase?.steps.length
      ? testCase.steps.map((step) => ({ action: step.action, expected: step.expected ?? '' }))
      : [{ action: '', expected: '' }],
  )

  const change = (index: number, patch: Partial<StepDraft>) =>
    setSteps(steps.map((step, i) => (i === index ? { ...step, ...patch } : step)))
  const swap = (a: number, b: number) => {
    const next = [...steps]
    ;[next[a], next[b]] = [next[b], next[a]]
    setSteps(next)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      {
        id: testCase?.id,
        title: title.trim(),
        preconditions: preconditions.trim() || null,
        steps: steps
          .filter((step) => step.action.trim())
          .map((step) => ({
            action: step.action.trim(),
            expected: step.expected.trim() || undefined,
          })),
      },
      {
        onSuccess: () => {
          toast.success(testCase ? 'Caso de teste atualizado.' : 'Caso de teste criado.')
          onClose()
        },
        onError: (error) => toast.error(apiErrorMessage(error)),
      },
    )
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={testCase ? 'Editar caso de teste' : 'Novo caso de teste'}
      size="xl"
    >
      <Stack component="form" gap="md" onSubmit={submit}>
        <TextInput
          label="Título"
          autoFocus
          minLength={2}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Textarea
          label="Pré-condições"
          placeholder="Ex.: usuário cadastrado e ativo"
          autosize
          minRows={2}
          maxLength={2000}
          value={preconditions}
          onChange={(e) => setPreconditions(e.target.value)}
        />
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Passos
          </Text>
          {steps.map((step, index) => (
            <Group key={index} gap="xs" align="flex-start" wrap="nowrap">
              <Text size="sm" c="dimmed" w={20} pt={6}>
                {index + 1}.
              </Text>
              <TextInput
                size="xs"
                style={{ flex: 1 }}
                placeholder="Ação"
                aria-label={`Ação do passo ${index + 1}`}
                maxLength={500}
                value={step.action}
                onChange={(e) => change(index, { action: e.target.value })}
              />
              <TextInput
                size="xs"
                style={{ flex: 1 }}
                placeholder="Resultado esperado"
                aria-label={`Resultado esperado do passo ${index + 1}`}
                maxLength={500}
                value={step.expected}
                onChange={(e) => change(index, { expected: e.target.value })}
              />
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Subir passo ${index + 1}`}
                disabled={index === 0}
                onClick={() => swap(index, index - 1)}
              >
                <IconArrowUp size={14} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Descer passo ${index + 1}`}
                disabled={index === steps.length - 1}
                onClick={() => swap(index, index + 1)}
              >
                <IconArrowDown size={14} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Remover passo ${index + 1}`}
                onClick={() => setSteps(steps.filter((_, i) => i !== index))}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          ))}
          <Button
            size="xs"
            variant="subtle"
            w="fit-content"
            leftSection={<IconPlus size={14} />}
            disabled={steps.length >= 50}
            onClick={() => setSteps([...steps, { action: '', expected: '' }])}
          >
            Adicionar passo
          </Button>
        </Stack>
        <Group justify="flex-end">
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
