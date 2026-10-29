import { SearchIcon, XIcon } from 'lucide-react'
import { useDepartments } from '@/features/admin/api'
import type { ProjectMembers } from '@/features/projects/api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { priorityLabels, type CardPriority, type Tag } from './api'
import { useBoardFilter, type BoardFilter } from './board-filter'

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
    width = 'w-40',
  ) => (
    <Select value={filter[name]} onValueChange={(value) => set(name, value)}>
      <SelectTrigger
        size="sm"
        className={`${width} bg-background ${filter[name] !== ANY ? 'border-primary' : ''}`}
        aria-label={label}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{label}: todos</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={filter.q}
          onChange={(e) => set('q', e.target.value)}
          placeholder="Filtrar por título ou número"
          aria-label="Filtrar cards"
          className="h-8 w-56 bg-background pl-8"
        />
      </div>
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
          'w-36',
        )}
      {select(
        'priority',
        'Prioridade',
        (Object.keys(priorityLabels) as CardPriority[]).map((p) => ({
          value: p,
          label: priorityLabels[p],
        })),
        'w-36',
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
        'w-36',
      )}
      {active && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <XIcon /> Limpar filtros
        </Button>
      )}
    </div>
  )
}
