import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActionIcon, Button, Checkbox, Group, Paper, Select, Stack, Text } from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { toast } from '@/shared/notify/toast'
import { useBoard } from '@/features/board/api'
import { requirableFieldLabels } from '@/features/board/move-errors'
import { severityOptions, type BugSeverity } from '@/features/qa/bug-severity'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { roleLabels, type Project, type ProjectRole } from '../api'

type RuleType =
  | 'CHECKLIST_COMPLETE'
  | 'REQUIRED_FIELDS'
  | 'ROLE_REQUIRED'
  | 'WIP_LIMIT'
  | 'QA_APPROVED'
  | 'NO_OPEN_BUGS'
  | 'TESTS_PASSED'

type Rule = {
  fromColumnId: string | null
  toColumnId: string | null
  type: RuleType
  config: {
    kind?: 'QA' | 'GENERAL'
    fields?: string[]
    roles?: ProjectRole[]
    minSeverity?: BugSeverity
  }
}

const typeLabels: Record<RuleType, string> = {
  REQUIRED_FIELDS: 'Campos obrigatórios',
  CHECKLIST_COMPLETE: 'Checklist completo',
  ROLE_REQUIRED: 'Só certos papéis movem',
  WIP_LIMIT: 'Respeitar o limite de WIP',
  QA_APPROVED: 'Aprovado pelo QA',
  NO_OPEN_BUGS: 'Sem bug aberto',
  TESTS_PASSED: 'Casos de teste aprovados',
}

const ANY = 'any'

const typeOptions = Object.entries(typeLabels).map(([value, label]) => ({ value, label }))

// The board's transition rules, edited as one list and saved together (PUT).
export function RulesSettings({ project, boardId }: { project: Project; boardId: string }) {
  const board = useBoard(project.id, boardId)
  const queryClient = useQueryClient()
  const key = ['rules', boardId]
  const saved = useQuery({
    queryKey: key,
    queryFn: () => http<(Rule & { id: string })[]>(`/boards/${boardId}/rules`),
  })
  const save = useMutation({
    mutationFn: (rules: Rule[]) =>
      http(`/boards/${boardId}/rules`, {
        method: 'PUT',
        body: JSON.stringify({ rules }),
      }),
    onSuccess: () => {
      toast.success('Regras salvas.')
      setDraft(null)
      return queryClient.invalidateQueries({ queryKey: key })
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, { 400: 'Revise as regras: alguma está incompleta.' })),
  })
  const [draft, setDraft] = useState<Rule[] | null>(null)
  const rules: Rule[] =
    draft ??
    (saved.data ?? []).map(({ fromColumnId, toColumnId, type, config }) => ({
      fromColumnId,
      toColumnId,
      type,
      config,
    }))
  const columns = board.data?.columns ?? []
  const change = (index: number, patch: Partial<Rule>) =>
    setDraft(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)))

  return (
    <Stack gap="md" maw={768}>
      <Text size="sm" c="dimmed">
        As regras valem quando um card muda de coluna. Se alguma falhar, o card volta para o lugar e
        a pessoa vê o que falta.
      </Text>
      {rules.map((rule, index) => (
        <Paper key={index} withBorder radius="md" p="sm">
          <Stack gap="sm">
            <Group gap="xs">
              <Select
                size="xs"
                w={220}
                aria-label="Tipo da regra"
                value={rule.type}
                onChange={(type) => type && change(index, { type: type as RuleType, config: {} })}
                allowDeselect={false}
                data={typeOptions}
              />
              <Text size="sm" c="dimmed">
                de
              </Text>
              <ColumnSelect
                label="Coluna de origem"
                value={rule.fromColumnId}
                columns={columns}
                onChange={(fromColumnId) => change(index, { fromColumnId })}
              />
              <Text size="sm" c="dimmed">
                para
              </Text>
              <ColumnSelect
                label="Coluna de destino"
                value={rule.toColumnId}
                columns={columns}
                onChange={(toColumnId) => change(index, { toColumnId })}
              />
              <ActionIcon
                ml="auto"
                variant="subtle"
                color="red"
                aria-label="Remover regra"
                onClick={() => setDraft(rules.filter((_, i) => i !== index))}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
            <RuleConfig rule={rule} onChange={(config) => change(index, { config })} />
          </Stack>
        </Paper>
      ))}
      {rules.length === 0 && saved.isSuccess && (
        <Text size="sm" c="dimmed">
          Nenhuma regra. Os cards se movem livremente.
        </Text>
      )}
      <Group gap="xs">
        <Button
          variant="default"
          leftSection={<IconPlus size={16} />}
          onClick={() =>
            setDraft([
              ...rules,
              {
                fromColumnId: null,
                toColumnId: columns.at(-1)?.id ?? null,
                type: 'REQUIRED_FIELDS',
                config: { fields: ['storyPoints'] },
              },
            ])
          }
        >
          Adicionar regra
        </Button>
        {draft && (
          <>
            <Button loading={save.isPending} onClick={() => save.mutate(draft)}>
              Salvar regras
            </Button>
            <Button variant="subtle" color="gray" onClick={() => setDraft(null)}>
              Descartar
            </Button>
          </>
        )}
      </Group>
    </Stack>
  )
}

function ColumnSelect({
  label,
  value,
  columns,
  onChange,
}: {
  label: string
  value: string | null
  columns: { id: string; name: string }[]
  onChange: (id: string | null) => void
}) {
  return (
    <Select
      size="xs"
      w={170}
      aria-label={label}
      value={value ?? ANY}
      onChange={(v) => onChange(!v || v === ANY ? null : v)}
      allowDeselect={false}
      data={[
        { value: ANY, label: 'qualquer coluna' },
        ...columns.map((column) => ({ value: column.id, label: column.name })),
      ]}
    />
  )
}

function CheckboxList<T extends string>({
  options,
  selected,
  onChange,
}: {
  options: Record<T, string>
  selected: T[]
  onChange: (values: T[]) => void
}) {
  return (
    <Checkbox.Group value={selected} onChange={(values) => onChange(values as T[])}>
      <Group gap="md">
        {(Object.entries(options) as [T, string][]).map(([value, label]) => (
          <Checkbox key={value} value={value} label={label} size="xs" />
        ))}
      </Group>
    </Checkbox.Group>
  )
}

function RuleConfig({
  rule,
  onChange,
}: {
  rule: Rule
  onChange: (config: Rule['config']) => void
}) {
  switch (rule.type) {
    case 'REQUIRED_FIELDS':
      return (
        <CheckboxList
          options={requirableFieldLabels}
          selected={rule.config.fields ?? []}
          onChange={(fields) => onChange({ fields })}
        />
      )
    case 'ROLE_REQUIRED':
      return (
        <CheckboxList
          options={roleLabels}
          selected={rule.config.roles ?? []}
          onChange={(roles) => onChange({ roles })}
        />
      )
    case 'CHECKLIST_COMPLETE':
      return (
        <Select
          size="xs"
          w={220}
          aria-label="Itens exigidos"
          value={rule.config.kind ?? 'ALL'}
          onChange={(kind) =>
            onChange(!kind || kind === 'ALL' ? {} : { kind: kind as 'QA' | 'GENERAL' })
          }
          allowDeselect={false}
          data={[
            { value: 'ALL', label: 'Todos os itens' },
            { value: 'QA', label: 'Só os itens de QA' },
            { value: 'GENERAL', label: 'Só os itens gerais' },
          ]}
        />
      )
    case 'WIP_LIMIT':
      return (
        <Text size="xs" c="dimmed">
          Usa o limite de WIP definido na coluna de destino (aba Colunas).
        </Text>
      )
    case 'QA_APPROVED':
      return (
        <Text size="xs" c="dimmed">
          A última revisão do QA (ou PO / gestor) precisa ter aprovado o card.
        </Text>
      )
    case 'NO_OPEN_BUGS':
      return (
        <Select
          size="xs"
          w={260}
          aria-label="Severidade mínima"
          value={rule.config.minSeverity ?? 'LOW'}
          onChange={(value) => onChange({ minSeverity: (value ?? 'LOW') as BugSeverity })}
          allowDeselect={false}
          data={severityOptions.map((option) => ({
            value: option.value,
            label:
              option.value === 'LOW'
                ? 'Qualquer bug aberto'
                : `Bugs ${option.label.toLowerCase()} ou mais graves`,
          }))}
        />
      )
    case 'TESTS_PASSED':
      return (
        <Text size="xs" c="dimmed">
          Todos os casos de teste anexados ao card precisam ter passado na rodada atual.
        </Text>
      )
  }
}
