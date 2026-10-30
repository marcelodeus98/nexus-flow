import {
  Badge,
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { IconBug } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { upsertCard } from '@/features/board/api'
import {
  severityColors,
  severityLabels,
  severityOptions,
  type BugSeverity,
} from '@/features/qa/bug-severity'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { toast } from '@/shared/notify/toast'
import { cardKeys, type BugDetails, type CardDetail } from '../api'
import { Section } from './section'

type BugFields = Omit<BugDetails, 'foundIn'>

// On a bug card: severity, environment, steps, expected and actual result,
// and the card where it was found. Text fields save when they lose focus.
export function BugSection({
  projectId,
  projectKey,
  card,
  editable,
}: {
  projectId: string
  projectKey: string
  card: CardDetail
  editable: boolean
}) {
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: (patch: Partial<BugFields>) =>
      http<CardDetail>(`/cards/${card.id}/bug`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(cardKeys.byNumber(projectId, updated.number), updated)
      upsertCard(queryClient, projectId, updated)
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })
  const bug = card.bug
  if (!bug) return null

  const text = (field: 'environment' | 'steps' | 'expected' | 'actual') => ({
    defaultValue: bug[field] ?? '',
    disabled: !editable,
    onBlur: (e: { target: { value: string } }) => {
      const value = e.target.value.trim() || null
      if (value !== bug[field]) save.mutate({ [field]: value })
    },
  })

  return (
    <Section
      title={
        <Group gap={6} component="span">
          <IconBug size={18} color="var(--mantine-color-red-6)" /> Bug
        </Group>
      }
      aside={
        bug.foundIn && (
          <Text size="sm" c="dimmed">
            encontrado em{' '}
            <Link to={`/p/${projectKey}/c/${bug.foundIn.number}`} className="text-link">
              {projectKey}-{bug.foundIn.number}
            </Link>
          </Text>
        )
      }
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} key={card.version}>
        <Select
          size="xs"
          label="Severidade"
          value={bug.severity}
          disabled={!editable}
          onChange={(value) => value && save.mutate({ severity: value as BugSeverity })}
          allowDeselect={false}
          data={severityOptions}
        />
        <TextInput size="xs" label="Ambiente" maxLength={300} {...text('environment')} />
      </SimpleGrid>
      <Textarea
        key={`steps-${card.version}`}
        size="xs"
        label="Passos para reproduzir"
        autosize
        minRows={3}
        maxLength={5000}
        {...text('steps')}
      />
      <SimpleGrid cols={{ base: 1, sm: 2 }} key={`results-${card.version}`}>
        <Textarea
          size="xs"
          label="Resultado esperado"
          autosize
          minRows={2}
          maxLength={2000}
          {...text('expected')}
        />
        <Textarea
          size="xs"
          label="Resultado obtido"
          autosize
          minRows={2}
          maxLength={2000}
          {...text('actual')}
        />
      </SimpleGrid>
    </Section>
  )
}

// On the card being tested: the bugs found in it, and "Reportar bug", which
// creates one already linked to it and assigned to the same people.
export function BugsFoundSection({
  projectKey,
  card,
  canReport,
}: {
  projectKey: string
  card: CardDetail
  canReport: boolean
}) {
  const [reporting, setReporting] = useState(false)
  if (card.type === 'BUG' || (!canReport && card.bugsFound.length === 0)) return null
  const open = card.bugsFound.filter((bug) => bug.open).length

  return (
    <Section
      title="Bugs encontrados"
      aside={
        <>
          {card.bugsFound.length > 0 && (
            <Text size="sm" c="dimmed">
              {open} aberto(s) de {card.bugsFound.length}
            </Text>
          )}
          {canReport && (
            <Button
              ml="auto"
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconBug size={14} />}
              onClick={() => setReporting(true)}
            >
              Reportar bug
            </Button>
          )}
        </>
      }
    >
      {card.bugsFound.length > 0 && (
        <ul className="card-drawer__list">
          {card.bugsFound.map((bug) => (
            <li key={bug.id}>
              <Text
                size="sm"
                style={{ flex: 1, minWidth: 0 }}
                td={bug.open ? undefined : 'line-through'}
              >
                <Link to={`/p/${projectKey}/c/${bug.number}`} className="card-drawer__link">
                  <Text span size="xs" c="dimmed" ff="monospace">
                    {projectKey}-{bug.number}
                  </Text>{' '}
                  {bug.title}
                </Link>
              </Text>
              <Badge size="sm" variant="light" color={severityColors[bug.severity]}>
                {severityLabels[bug.severity]}
              </Badge>
              <Text size="xs" c="dimmed">
                {bug.columnName}
              </Text>
            </li>
          ))}
        </ul>
      )}
      {reporting && <ReportBugModal card={card} onClose={() => setReporting(false)} />}
    </Section>
  )
}

function ReportBugModal({ card, onClose }: { card: CardDetail; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [severity, setSeverity] = useState<BugSeverity>('MEDIUM')
  const [environment, setEnvironment] = useState('')
  const [steps, setSteps] = useState('')
  const [expected, setExpected] = useState('')
  const [actual, setActual] = useState('')
  const report = useMutation({
    mutationFn: () =>
      http<CardDetail>(`/cards/${card.id}/bugs`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          severity,
          environment: environment.trim() || undefined,
          steps: steps.trim() || undefined,
          expected: expected.trim() || undefined,
          actual: actual.trim() || undefined,
        }),
      }),
    onSuccess: (bug) => {
      toast.success(`Bug ${bug.number} reportado.`)
      onClose()
      return queryClient.invalidateQueries({ queryKey: ['cards', 'number'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (title.trim()) report.mutate()
  }

  return (
    <Modal opened onClose={onClose} title="Reportar bug" size="lg">
      <Stack component="form" gap="sm" onSubmit={submit}>
        <Text size="sm" c="dimmed">
          O bug vai para "A fazer" deste board, ligado a este card e atribuído aos mesmos
          responsáveis.
        </Text>
        <TextInput
          label="Título"
          autoFocus
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Severidade"
            value={severity}
            onChange={(value) => value && setSeverity(value as BugSeverity)}
            allowDeselect={false}
            data={severityOptions}
          />
          <TextInput
            label="Ambiente"
            placeholder="Navegador, versão, homologação…"
            maxLength={300}
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
          />
        </SimpleGrid>
        <Textarea
          label="Passos para reproduzir"
          autosize
          minRows={3}
          maxLength={5000}
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Textarea
            label="Resultado esperado"
            autosize
            minRows={2}
            maxLength={2000}
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
          />
          <Textarea
            label="Resultado obtido"
            autosize
            minRows={2}
            maxLength={2000}
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
        </SimpleGrid>
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" color="red" loading={report.isPending}>
            Reportar bug
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
