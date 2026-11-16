import { Badge, Group, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { http } from '@/shared/api/http'
import {
  ViewCardLink,
  ViewDrawer,
  ViewEmpty,
  ViewFigures,
  ViewSection,
  formatDate,
  formatDateTime,
  type ViewCard,
} from '@/shared/ui/view-drawer'
import type { TestCase } from './test-cases-api'
import './test-cases-page.css'

type RunStatus = 'PASSED' | 'FAILED' | 'BLOCKED'

type TestCaseDetail = TestCase & {
  attachedCards: number
  totalRuns: number
  runs: {
    id: string
    round: number
    status: RunStatus
    notes: string | null
    executedAt: string
    executedBy: string | null
    card: ViewCard
  }[]
}

const RUN: Record<RunStatus, { label: string; color: string }> = {
  PASSED: { label: 'Passou', color: 'teal' },
  FAILED: { label: 'Falhou', color: 'red' },
  BLOCKED: { label: 'Bloqueado', color: 'yellow' },
}

// "Visualizar" for a test case: the script in reading mode and its latest
// runs on cards.
export function TestCaseView({
  testCaseId,
  onClose,
  onEdit,
}: {
  testCaseId: string
  onClose: () => void
  onEdit?: () => void
}) {
  const detail = useQuery({
    queryKey: ['test-cases', 'detail', testCaseId],
    queryFn: () => http<TestCaseDetail>(`/test-cases/${testCaseId}`),
  })
  const t = detail.data
  const passed = t?.runs.filter((r) => r.status === 'PASSED').length ?? 0

  return (
    <ViewDrawer
      onClose={onClose}
      title={t?.title ?? 'Caso de teste'}
      subtitle={t ? `Atualizado em ${formatDate(t.updatedAt)}` : undefined}
      badges={
        t?.archivedAt && (
          <Badge color="gray" variant="light">
            Arquivado
          </Badge>
        )
      }
      onEdit={onEdit}
      loading={detail.isPending}
      error={detail.error}
    >
      {t && (
        <>
          <ViewFigures
            figures={[
              { label: 'passos', value: t.steps.length },
              { label: 'cards com o caso', value: t.attachedCards },
              { label: 'execuções', value: t.totalRuns },
            ]}
          />
          <ViewSection title="Pré-condições">
            {t.preconditions ? (
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {t.preconditions}
              </Text>
            ) : (
              <ViewEmpty>Nenhuma.</ViewEmpty>
            )}
          </ViewSection>
          <ViewSection title="Passos">
            <ol className="test-case-view__steps">
              {t.steps.map((step, i) => (
                <li key={i}>
                  <Text size="sm">{step.action}</Text>
                  {step.expected && (
                    <Text size="xs" c="dimmed">
                      Esperado: {step.expected}
                    </Text>
                  )}
                </li>
              ))}
            </ol>
          </ViewSection>
          <ViewSection
            title="Últimas execuções"
            aside={
              t.runs.length > 0 && (
                <Text size="xs" c="dimmed">
                  {passed} de {t.runs.length} passaram
                </Text>
              )
            }
          >
            {t.runs.length === 0 ? (
              <ViewEmpty>O caso ainda não foi executado.</ViewEmpty>
            ) : (
              t.runs.map((run) => (
                <div key={run.id} className="test-case-view__run">
                  <Group gap={6} justify="space-between" wrap="nowrap">
                    <Group gap={6} wrap="nowrap">
                      <Badge size="sm" color={RUN[run.status].color} variant="light">
                        {RUN[run.status].label}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        rodada {run.round}
                        {run.executedBy && ` · ${run.executedBy}`}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {formatDateTime(run.executedAt)}
                    </Text>
                  </Group>
                  <ViewCardLink card={run.card} />
                  {run.notes && (
                    <Text size="xs" c="dimmed" mt={2}>
                      “{run.notes}”
                    </Text>
                  )}
                </div>
              ))
            )}
          </ViewSection>
        </>
      )}
    </ViewDrawer>
  )
}
