import { ActionIcon, Group, Paper, Stack, Text, Title, Tooltip } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { columnColor, type BoardColumn, type CardSummary } from './api'
import type { CardLookups } from './board-card'
import './views.css'

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const MAX_PER_DAY = 4

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`

// Cards by due date in a month grid, so deadlines and busy weeks show at a
// glance. Each card wears its column's color; cards without a due date are
// counted below. The board's filters apply here too.
export function CalendarView({
  columns,
  cards,
  lookups,
}: {
  columns: BoardColumn[]
  cards: CardSummary[]
  lookups: CardLookups
}) {
  const [month, setMonth] = useState(() => {
    const [year, m] = lookups.today.split('-').map(Number)
    return { year, month: m - 1 }
  })
  const columnsById = new Map(columns.map((column) => [column.id, column]))
  const byDay = new Map<string, CardSummary[]>()
  for (const card of cards) {
    if (!card.dueDate) continue
    const key = card.dueDate.slice(0, 10)
    byDay.set(key, [...(byDay.get(key) ?? []), card])
  }
  const undated = cards.filter((card) => !card.dueDate).length

  // Monday-first grid covering the whole month.
  const first = new Date(Date.UTC(month.year, month.month, 1))
  const lead = (first.getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate()
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => {
    const day = i - lead + 1
    return day >= 1 && day <= days ? day : null
  })
  const monthName = first.toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })
  const label = `${monthName[0].toUpperCase()}${monthName.slice(1)} de ${month.year}`
  const shift = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const next = new Date(Date.UTC(year, m + delta, 1))
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() }
    })

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <ActionIcon variant="default" aria-label="Mês anterior" onClick={() => shift(-1)}>
              <IconChevronLeft size={16} />
            </ActionIcon>
            <Title order={4} miw={180} ta="center">
              {label}
            </Title>
            <ActionIcon variant="default" aria-label="Próximo mês" onClick={() => shift(1)}>
              <IconChevronRight size={16} />
            </ActionIcon>
          </Group>
          <Text size="sm" c="dimmed">
            {cards.length === 0
              ? 'Nenhum card com os filtros atuais.'
              : undated === 0
                ? 'Todos os cards têm prazo.'
                : `${undated} ${undated === 1 ? 'card sem prazo não aparece' : 'cards sem prazo não aparecem'} aqui.`}
          </Text>
        </Group>
        <div className="calendar-view" role="grid" aria-label={`Cards por prazo em ${label}`}>
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className="calendar-view__weekday" role="columnheader">
              {weekday}
            </div>
          ))}
          {cells.map((day, index) => {
            if (day === null) return <div key={`x${index}`} className="calendar-view__blank" />
            const key = dayKey(month.year, month.month, day)
            const due = byDay.get(key) ?? []
            const past = key < lookups.today
            return (
              <div
                key={key}
                role="gridcell"
                className={`calendar-view__day${key === lookups.today ? ' calendar-view__day--today' : ''}`}
              >
                <span className="calendar-view__number">{day}</span>
                {due.slice(0, MAX_PER_DAY).map((card) => {
                  const column = columnsById.get(card.columnId)
                  const late = past && column?.category !== 'DONE'
                  return (
                    <Tooltip
                      key={card.id}
                      label={`${lookups.projectKey}-${card.number} · ${column?.name ?? ''}`}
                    >
                      <Link
                        to={`c/${card.number}`}
                        className={`calendar-view__card${late ? ' calendar-view__card--late' : ''}`}
                        style={{ borderLeftColor: column ? columnColor(column) : undefined }}
                      >
                        {card.title}
                      </Link>
                    </Tooltip>
                  )
                })}
                {due.length > MAX_PER_DAY && (
                  <Text size="xs" c="dimmed">
                    +{due.length - MAX_PER_DAY} mais
                  </Text>
                )}
              </div>
            )
          })}
        </div>
      </Stack>
    </Paper>
  )
}
