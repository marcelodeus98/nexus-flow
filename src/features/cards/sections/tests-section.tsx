import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core'
import { IconBan, IconCheck, IconX } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { severityOptions, type BugSeverity } from '@/features/qa/bug-severity'
import { useTestCases, type TestCase } from '@/features/qa/test-cases-api'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { toast } from '@/shared/notify/toast'
import { cardKeys, type CardDetail } from '../api'
import { Section } from './section'

type TestStatus = 'PASSED' | 'FAILED' | 'BLOCKED'

type Result = {
  status: TestStatus
  notes: string | null
  executedAt: string
  executedBy: { id: string; name: string | null } | null
}

type CardTests = {
  round: number
  tests: {
    testCase: TestCase
    result: Result | null
    previous: (Result & { round: number }) | null
  }[]
}

const statusLabels: Record<TestStatus, string> = {
  PASSED: 'Passou',
  FAILED: 'Falhou',
  BLOCKED: 'Bloqueado',
}

const statusColors: Record<TestStatus, string> = {
  PASSED: 'brand',
  FAILED: 'red',
  BLOCKED: 'gray',
}

// The project's test cases run on this card in the current QA round (a
// rejection starts a new round: everything is pending again, and the
// previous result is shown next to it).
export function TestsSection({
  projectId,
  card,
  canRun,
}: {
  projectId: string
  card: CardDetail
  canRun: boolean
}) {
  const queryClient = useQueryClient()
  const key = cardKeys.tests(card.id)
  const tests = useQuery({
    queryKey: key,
    queryFn: () => http<CardTests>(`/cards/${card.id}/tests`),
  })
  const library = useTestCases(projectId, canRun)
  const [adding, setAdding] = useState<string[]>([])
  const [failing, setFailing] = useState<TestCase>()

  const onSuccess = (data: CardTests) => queryClient.setQueryData(key, data)
  const onError = (error: unknown) => toast.error(apiErrorMessage(error))
  const attach = useMutation({
    mutationFn: (testCaseIds: string[]) =>
      http<CardTests>(`/cards/${card.id}/tests`, {
        method: 'POST',
        body: JSON.stringify({ testCaseIds }),
      }),
    onSuccess: (data) => {
      onSuccess(data)
      setAdding([])
    },
    onError,
  })
  const detach = useMutation({
    mutationFn: (testCaseId: string) =>
      http<CardTests>(`/cards/${card.id}/tests/${testCaseId}`, { method: 'DELETE' }),
    onSuccess,
    onError,
  })
  const run = useMutation({
    mutationFn: ({
      testCaseId,
      ...body
    }: {
      testCaseId: string
      status: TestStatus
      notes?: string
      reportBug?: boolean
      bugSeverity?: BugSeverity
    }) =>
      http<CardTests & { bug: { number: number } | null }>(
        `/cards/${card.id}/tests/${testCaseId}/run`,
        { method: 'PUT', body: JSON.stringify(body) },
      ),
    onSuccess: (data) => {
      onSuccess(data)
      if (data.bug) {
        toast.success(`Bug ${data.bug.number} reportado.`)
        void queryClient.invalidateQueries({ queryKey: ['cards', 'number'] })
      }
    },
    onError,
  })

  const list = tests.data?.tests ?? []
  if (!canRun && list.length === 0) return null
  const passed = list.filter((t) => t.result?.status === 'PASSED').length
  const attachedIds = new Set(list.map((t) => t.testCase.id))
  const available = (library.data ?? []).filter((c) => !attachedIds.has(c.id))

  return (
    <Section
      title="Casos de teste"
      aside={
        tests.data && (
          <Text size="sm" c="dimmed">
            rodada {tests.data.round} · {passed}/{list.length} passaram
          </Text>
        )
      }
    >
      {list.length > 0 && (
        <ul className="card-drawer__list">
          {list.map(({ testCase, result, previous }) => (
            <li key={testCase.id} className="tests-section__row">
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500}>
                  {testCase.title}
                </Text>
                {result?.notes && (
                  <Text size="xs" c="dimmed">
                    “{result.notes}”
                  </Text>
                )}
                {previous && !result && (
                  <Text size="xs" c="dimmed">
                    Rodada {previous.round}: {statusLabels[previous.status].toLowerCase()}
                  </Text>
                )}
              </Stack>
              {result ? (
                <Tooltip
                  label={`${result.executedBy?.name ?? 'Alguém'} em ${new Date(
                    result.executedAt,
                  ).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`}
                >
                  <Badge size="sm" variant="light" color={statusColors[result.status]}>
                    {statusLabels[result.status]}
                  </Badge>
                </Tooltip>
              ) : (
                <Badge size="sm" variant="outline" color="gray">
                  Pendente
                </Badge>
              )}
              {canRun && (
                <Group gap={2} wrap="nowrap">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={`${testCase.title}: passou`}
                    onClick={() => run.mutate({ testCaseId: testCase.id, status: 'PASSED' })}
                  >
                    <IconCheck size={14} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    aria-label={`${testCase.title}: falhou`}
                    onClick={() => setFailing(testCase)}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    aria-label={`${testCase.title}: bloqueado`}
                    onClick={() => run.mutate({ testCaseId: testCase.id, status: 'BLOCKED' })}
                  >
                    <IconBan size={14} />
                  </ActionIcon>
                  <Button
                    variant="subtle"
                    color="gray"
                    size="compact-xs"
                    onClick={() => detach.mutate(testCase.id)}
                  >
                    Remover
                  </Button>
                </Group>
              )}
            </li>
          ))}
        </ul>
      )}
      {canRun && (
        <Group gap="xs" align="flex-start" wrap="nowrap">
          <MultiSelect
            size="xs"
            style={{ flex: 1 }}
            aria-label="Casos de teste para anexar"
            placeholder={
              available.length ? 'Anexar casos de teste…' : 'Nenhum caso disponível na biblioteca'
            }
            searchable
            value={adding}
            onChange={setAdding}
            data={available.map((c) => ({ value: c.id, label: c.title }))}
          />
          <Button
            size="xs"
            variant="default"
            disabled={adding.length === 0}
            loading={attach.isPending}
            onClick={() => attach.mutate(adding)}
          >
            Anexar
          </Button>
        </Group>
      )}
      {failing && (
        <FailModal
          testCase={failing}
          pending={run.isPending}
          onClose={() => setFailing(undefined)}
          onSubmit={(input) =>
            run.mutate(
              { testCaseId: failing.id, status: 'FAILED', ...input },
              { onSuccess: () => setFailing(undefined) },
            )
          }
        />
      )}
    </Section>
  )
}

function FailModal({
  testCase,
  pending,
  onClose,
  onSubmit,
}: {
  testCase: TestCase
  pending: boolean
  onClose: () => void
  onSubmit: (input: { notes?: string; reportBug: boolean; bugSeverity: BugSeverity }) => void
}) {
  const [notes, setNotes] = useState('')
  const [reportBug, setReportBug] = useState(true)
  const [severity, setSeverity] = useState<BugSeverity>('MEDIUM')

  return (
    <Modal opened onClose={onClose} title={`Falhou: ${testCase.title}`}>
      <Stack
        component="form"
        gap="sm"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit({ notes: notes.trim() || undefined, reportBug, bugSeverity: severity })
        }}
      >
        <Textarea
          label="O que aconteceu?"
          autoFocus
          autosize
          minRows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Checkbox
          label="Reportar bug (preenchido com os passos e o resultado esperado do caso)"
          checked={reportBug}
          onChange={(e) => setReportBug(e.currentTarget.checked)}
        />
        {reportBug && (
          <Select
            label="Severidade do bug"
            value={severity}
            onChange={(value) => value && setSeverity(value as BugSeverity)}
            allowDeselect={false}
            data={severityOptions}
          />
        )}
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" color="red" loading={pending}>
            Registrar falha
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
