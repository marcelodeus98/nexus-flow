import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useBoard } from '@/features/board/api'
import { requirableFieldLabels } from '@/features/board/move-errors'
import { apiErrorMessage } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { roleLabels, type Project, type ProjectRole } from '../api'

type RuleType = 'CHECKLIST_COMPLETE' | 'REQUIRED_FIELDS' | 'ROLE_REQUIRED' | 'WIP_LIMIT'

type Rule = {
  fromColumnId: string | null
  toColumnId: string | null
  type: RuleType
  config: { kind?: 'QA' | 'GENERAL'; fields?: string[]; roles?: ProjectRole[] }
}

const typeLabels: Record<RuleType, string> = {
  REQUIRED_FIELDS: 'Campos obrigatórios',
  CHECKLIST_COMPLETE: 'Checklist completo',
  ROLE_REQUIRED: 'Só certos papéis movem',
  WIP_LIMIT: 'Respeitar o limite de WIP',
}

const ANY = 'any'

// The board's transition rules, edited as one list and saved together (PUT).
export function RulesSettings({ project }: { project: Project }) {
  const board = useBoard(project.id)
  const queryClient = useQueryClient()
  const key = ['rules', project.defaultBoardId]
  const saved = useQuery({
    queryKey: key,
    queryFn: () => http<(Rule & { id: string })[]>(`/boards/${project.defaultBoardId}/rules`),
  })
  const save = useMutation({
    mutationFn: (rules: Rule[]) =>
      http(`/boards/${project.defaultBoardId}/rules`, {
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
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        As regras valem quando um card muda de coluna. Se alguma falhar, o card volta para o lugar e
        a pessoa vê o que falta.
      </p>
      <ul className="space-y-3">
        {rules.map((rule, index) => (
          <li key={index} className="space-y-3 rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Select
                value={rule.type}
                onValueChange={(type) => change(index, { type: type as RuleType, config: {} })}
              >
                <SelectTrigger size="sm" className="w-56" aria-label="Tipo da regra">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">de</span>
              <ColumnSelect
                label="Coluna de origem"
                value={rule.fromColumnId}
                columns={columns}
                onChange={(fromColumnId) => change(index, { fromColumnId })}
              />
              <span className="text-muted-foreground">para</span>
              <ColumnSelect
                label="Coluna de destino"
                value={rule.toColumnId}
                columns={columns}
                onChange={(toColumnId) => change(index, { toColumnId })}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto"
                aria-label="Remover regra"
                onClick={() => setDraft(rules.filter((_, i) => i !== index))}
              >
                <Trash2Icon />
              </Button>
            </div>
            <RuleConfig rule={rule} onChange={(config) => change(index, { config })} />
          </li>
        ))}
      </ul>
      {rules.length === 0 && saved.isSuccess && (
        <p className="text-sm text-muted-foreground">
          Nenhuma regra. Os cards se movem livremente.
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
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
          <PlusIcon /> Adicionar regra
        </Button>
        {draft && (
          <>
            <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>
              Salvar regras
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Descartar
            </Button>
          </>
        )}
      </div>
    </div>
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
    <Select value={value ?? ANY} onValueChange={(v) => onChange(v === ANY ? null : v)}>
      <SelectTrigger size="sm" className="w-40" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>qualquer coluna</SelectItem>
        {columns.map((column) => (
          <SelectItem key={column.id} value={column.id}>
            {column.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {(Object.entries(options) as [T, string][]).map(([value, label]) => (
        <div key={value} className="flex items-center gap-1.5">
          <Checkbox
            id={`opt-${value}`}
            checked={selected.includes(value)}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selected, value] : selected.filter((v) => v !== value))
            }
          />
          <Label htmlFor={`opt-${value}`} className="font-normal">
            {label}
          </Label>
        </div>
      ))}
    </div>
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
          value={rule.config.kind ?? 'ALL'}
          onValueChange={(kind) =>
            onChange(kind === 'ALL' ? {} : { kind: kind as 'QA' | 'GENERAL' })
          }
        >
          <SelectTrigger size="sm" className="w-56" aria-label="Itens exigidos">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os itens</SelectItem>
            <SelectItem value="QA">Só os itens de QA</SelectItem>
            <SelectItem value="GENERAL">Só os itens gerais</SelectItem>
          </SelectContent>
        </Select>
      )
    case 'WIP_LIMIT':
      return (
        <p className="text-xs text-muted-foreground">
          Usa o limite de WIP definido na coluna de destino (aba Colunas).
        </p>
      )
  }
}
