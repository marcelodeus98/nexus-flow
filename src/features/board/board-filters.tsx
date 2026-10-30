import { Button, Group, Select, TextInput } from '@mantine/core'
import { IconSearch, IconX } from '@tabler/icons-react'
import { useDepartments } from '@/features/admin/api'
import type { ProjectMembers } from '@/features/projects/api'
import { priorityLabels, type CardPriority, type Tag } from './api'
import { useBoardFilter, type BoardFilter } from './board-filter'
import { severityOptions } from '@/features/qa/bug-severity'

const ANY = 'any'

export function BoardFilters({
  members,
  tags,
}: {
  members: ProjectMembers['members']
  tags: Tag[]
}) {
  const { filter, set, clear, active } = useBoardFilter()
  const departments = useDepartments()

  const select = (
    name: keyof BoardFilter,
    label: string,
    options: { value: string; label: string }[],
    width = 160,
  ) => (
    <Select
      size="xs"
      w={width}
      aria-label={label}
      value={filter[name]}
      onChange={(value) => set(name, value ?? ANY)}
      allowDeselect={false}
      styles={filter[name] !== ANY ? { input: { borderColor: 'var(--nexa-teal-700)' } } : undefined}
      data={[{ value: ANY, label: `${label}: todos` }, ...options]}
    />
  )

  return (
    <Group gap="xs">
      <TextInput
        size="xs"
        w={224}
        type="search"
        leftSection={<IconSearch size={14} />}
        value={filter.q}
        onChange={(e) => set('q', e.target.value)}
        placeholder="Filtrar por título ou número"
        aria-label="Filtrar cards"
      />
      {select('assignee', 'Responsável', [
        { value: 'me', label: 'Atribuídos a mim' },
        { value: 'none', label: 'Sem responsável' },
        ...members.map((m) => ({ value: m.user.id, label: m.user.name })),
      ])}
      {tags.length > 0 &&
        select(
          'tag',
          'Tag',
          tags.map((tag) => ({ value: tag.id, label: tag.name })),
          144,
        )}
      {select(
        'priority',
        'Prioridade',
        (Object.keys(priorityLabels) as CardPriority[]).map((p) => ({
          value: p,
          label: priorityLabels[p],
        })),
        144,
      )}
      {select(
        'department',
        'Departamento',
        (departments.data ?? []).map((d) => ({ value: d.id, label: d.name })),
      )}
      {select(
        'due',
        'Prazo',
        [
          { value: 'overdue', label: 'Atrasados' },
          { value: 'week', label: 'Próximos 7 dias' },
          { value: 'none', label: 'Sem prazo' },
        ],
        144,
      )}
      {select(
        'type',
        'Tipo',
        [
          { value: 'TASK', label: 'Tarefas' },
          { value: 'BUG', label: 'Bugs' },
        ],
        130,
      )}
      {select('severity', 'Severidade', severityOptions, 150)}
      {active && (
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<IconX size={14} />}
          onClick={clear}
        >
          Limpar filtros
        </Button>
      )}
    </Group>
  )
}
