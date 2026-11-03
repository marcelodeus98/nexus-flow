import { Badge, Group, Paper, Select, Table, Text } from '@mantine/core'
import { IconBug, IconCornerDownRight } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { severityColors, severityLabels } from '@/features/qa/bug-severity'
import { columnColor, priorityLabels, type BoardColumn, type CardSummary } from './api'
import type { CardLookups } from './board-card'
import { AddCard } from './board-column'
import { estimateLabel, initials } from './card-format'
import './views.css'

type Sort = 'board' | 'priority' | 'due' | 'number'

const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const

const sorters: Record<Exclude<Sort, 'board'>, (a: CardSummary, b: CardSummary) => number> = {
  priority: (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  // Cards without a due date last.
  due: (a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'),
  number: (a, b) => a.number - b.number,
}

// The board as a table, grouped by column in board order: easier to scan
// many cards, compare fields and find what has no owner or due date. The
// filters and the sprint scope above apply here too.
export function ListView({
  projectId,
  columns,
  cardsIn,
  lookups,
  canCreate,
  onCreated,
}: {
  projectId: string
  columns: BoardColumn[]
  cardsIn: (columnId: string) => CardSummary[]
  lookups: CardLookups
  canCreate: boolean
  onCreated: (card: CardSummary) => void
}) {
  const navigate = useNavigate()
  const [sort, setSort] = useState<Sort>('board')
  const total = columns.reduce((sum, column) => sum + cardsIn(column.id).length, 0)

  return (
    <Paper withBorder radius="md">
      <Group justify="space-between" px="md" py="sm" className="list-view__toolbar">
        <Text size="sm" c="dimmed">
          {total === 1 ? '1 card' : `${total} cards`}
        </Text>
        <Select
          size="xs"
          w={200}
          aria-label="Ordenar por"
          value={sort}
          onChange={(value) => value && setSort(value as Sort)}
          allowDeselect={false}
          data={[
            { value: 'board', label: 'Ordem do board' },
            { value: 'priority', label: 'Prioridade' },
            { value: 'due', label: 'Prazo' },
            { value: 'number', label: 'Número' },
          ]}
        />
      </Group>
      <Table.ScrollContainer minWidth={860}>
        <Table verticalSpacing="xs" highlightOnHover className="list-view">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Card</Table.Th>
              <Table.Th w={110}>Prioridade</Table.Th>
              <Table.Th w={130}>Responsáveis</Table.Th>
              <Table.Th w={90}>Estimativa</Table.Th>
              <Table.Th w={100}>Prazo</Table.Th>
              <Table.Th w={100}>Subtarefas</Table.Th>
            </Table.Tr>
          </Table.Thead>
          {columns.map((column) => {
            const cards =
              sort === 'board' ? cardsIn(column.id) : [...cardsIn(column.id)].sort(sorters[sort])
            return (
              <Table.Tbody key={column.id}>
                <Table.Tr className="list-view__group">
                  <Table.Td colSpan={6}>
                    <Group gap="xs">
                      <span
                        className="list-view__dot"
                        style={{ background: columnColor(column) }}
                        aria-hidden
                      />
                      <Text size="sm" fw={700}>
                        {column.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {cards.length}
                      </Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
                {cards.map((card) => (
                  <Row
                    key={card.id}
                    card={card}
                    lookups={lookups}
                    onOpen={() => void navigate(`c/${card.number}`)}
                  />
                ))}
                {cards.length === 0 && !canCreate && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text size="xs" c="dimmed" pl="lg">
                        Nenhum card.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {canCreate && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <AddCard
                        projectId={projectId}
                        columnId={column.id}
                        onCreated={onCreated}
                        className="list-view__add"
                      />
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            )
          })}
        </Table>
      </Table.ScrollContainer>
    </Paper>
  )
}

function Row({
  card,
  lookups,
  onOpen,
}: {
  card: CardSummary
  lookups: CardLookups
  onOpen: () => void
}) {
  const overdue = card.dueDate !== null && card.dueDate.slice(0, 10) < lookups.today
  const parent = card.parentId ? lookups.numbersById.get(card.parentId) : undefined
  return (
    <Table.Tr
      className="list-view__row"
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      tabIndex={0}
      aria-label={`${lookups.projectKey}-${card.number} ${card.title}`}
    >
      <Table.Td>
        <Group gap={6} wrap="nowrap">
          {card.type === 'BUG' && (
            <IconBug size={14} color="var(--mantine-color-red-6)" aria-label="Bug" />
          )}
          <Text span size="xs" c="dimmed" ff="monospace">
            {lookups.projectKey}-{card.number}
          </Text>
          <Text span size="sm" fw={500} lineClamp={1}>
            {card.title}
          </Text>
          {card.bugSeverity && (
            <Badge size="xs" variant="light" color={severityColors[card.bugSeverity]}>
              {severityLabels[card.bugSeverity]}
            </Badge>
          )}
          {card.qaStatus && (
            <Badge size="xs" variant="light" color={card.qaStatus === 'APPROVED' ? 'brand' : 'red'}>
              {card.qaStatus === 'APPROVED' ? 'Aprovado' : 'Reprovado'}
            </Badge>
          )}
        </Group>
        {parent !== undefined && (
          <Group gap={2} c="dimmed">
            <IconCornerDownRight size={12} />
            <Text size="xs">
              subtarefa de {lookups.projectKey}-{parent}
            </Text>
          </Group>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm">{priorityLabels[card.priority]}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap={0} wrap="nowrap">
          {card.assigneeIds.slice(0, 4).map((id) => {
            const name = lookups.membersById.get(id)?.name ?? '?'
            return (
              <span key={id} title={name} className="board-card__avatar">
                {initials(name)}
              </span>
            )
          })}
          {card.assigneeIds.length === 0 && (
            <Text size="xs" c="dimmed">
              —
            </Text>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{estimateLabel(card, lookups.estimateView) ?? '—'}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c={overdue ? 'red' : undefined}>
          {card.dueDate
            ? new Date(card.dueDate).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                timeZone: 'UTC',
              })
            : '—'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {card.subtasksTotal > 0 ? `${card.subtasksDone}/${card.subtasksTotal}` : '—'}
        </Text>
      </Table.Td>
    </Table.Tr>
  )
}
