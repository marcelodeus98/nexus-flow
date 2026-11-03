import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { boardKeys, byRank, removeCard, upsertCard, type Board, type CardSummary } from './api'

const card = (id: string, rank: string, version = 1, columnId = 'c1'): CardSummary => ({
  id,
  number: 1,
  title: id,
  priority: 'MEDIUM',
  storyPoints: null,
  estimateMinutes: null,
  dueDate: null,
  columnId,
  rank,
  sprintId: null,
  parentId: null,
  type: 'TASK',
  bugSeverity: null,
  qaStatus: null,
  rejectionCount: 0,
  version,
  updatedAt: '2026-10-29T00:00:00.000Z',
  assigneeIds: [],
  tagIds: [],
  departments: [],
  checklistTotal: 0,
  checklistDone: 0,
  subtasksTotal: 0,
  subtasksDone: 0,
})

const column = (id: string) => ({
  id,
  name: id,
  rank: 'a0',
  category: 'TODO' as const,
  wipLimit: null,
  color: null,
})

function clientWith(cards: CardSummary[]) {
  const client = new QueryClient()
  client.setQueryData<Board>(boardKeys.board('p1', 'b1'), {
    board: { id: 'b1', name: 'Board' },
    columns: [column('c1')],
    cards,
  })
  return client
}

const titles = (client: QueryClient) =>
  client.getQueryData<Board>(boardKeys.board('p1', 'b1'))!.cards.map((c) => `${c.id}@${c.version}`)

describe('board cache', () => {
  it('orders ranks byte by byte, like the database', () => {
    // Uppercase sorts before lowercase in byte order ("Zz" < "a0").
    expect(
      [card('b', 'a0'), card('a', 'Zz'), card('c', 'a1')].sort(byRank).map((c) => c.id),
    ).toEqual(['a', 'b', 'c'])
  })

  it('applies newer versions and keeps the list sorted', () => {
    const client = clientWith([card('a', 'a0'), card('b', 'a1')])
    upsertCard(client, 'p1', card('a', 'a2', 2))
    upsertCard(client, 'p1', card('n', 'a0V', 1))
    expect(titles(client)).toEqual(['n@1', 'b@1', 'a@2'])
  })

  it('ignores a late event older than what it has', () => {
    const client = clientWith([card('a', 'a5', 3)])
    upsertCard(client, 'p1', card('a', 'a0', 2))
    expect(titles(client)).toEqual(['a@3'])
  })

  it('takes a card off the board when it moves to another board', () => {
    const client = clientWith([card('a', 'a0'), card('b', 'a1')])
    upsertCard(client, 'p1', card('a', 'a0', 2, 'elsewhere'))
    expect(titles(client)).toEqual(['b@1'])
    upsertCard(client, 'p1', card('x', 'a0', 1, 'elsewhere'))
    expect(titles(client)).toEqual(['b@1'])
  })

  it('removes deleted cards', () => {
    const client = clientWith([card('a', 'a0'), card('b', 'a1')])
    removeCard(client, 'p1', 'a')
    expect(titles(client)).toEqual(['b@1'])
  })
})
