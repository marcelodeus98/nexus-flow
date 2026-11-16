import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/api'
import { renderWithProviders } from '@/test/render'
import type { MapPerson, TeamMap } from './api'
import type { MapSelection } from './team-map-scene'
import { TeamMapPage } from './team-map-page'

// WebGL does not exist in jsdom: the scene becomes a list of buttons that
// select people the way a click in 3D would.
vi.mock('./team-map-scene', () => ({
  TeamMapScene: ({
    rooms,
    onSelect,
    isDimmed,
  }: {
    rooms: { id: string; spots: { person: MapPerson }[] }[]
    onSelect: (s: MapSelection) => void
    isDimmed: (p: MapPerson) => boolean
  }) => (
    <div data-testid="scene">
      {rooms.flatMap((room) =>
        room.spots.map(({ person }) => (
          <button
            key={person.id}
            type="button"
            data-dimmed={isDimmed(person)}
            onClick={() => onSelect({ kind: 'person', id: person.id })}
          >
            3D {person.name}
          </button>
        )),
      )}
    </div>
  ),
}))

const base = {
  jobTitle: null,
  teams: [],
  isMe: false,
  timer: null,
  inProgress: [],
  hiddenInProgress: 0,
  openCards: 0,
  overdue: 0,
  todaySeconds: 0,
  lastActivityAt: null,
  projectIds: ['p1'],
}

const map: TeamMap = {
  scope: 'MEMBER',
  generatedAt: '2026-11-16T15:00:00.000Z',
  departments: [{ id: 'd1', name: 'Desenvolvimento', color: '#2563EB' }],
  projects: [{ id: 'p1', key: 'NEXA', name: 'Nexa' }],
  people: [
    {
      ...base,
      id: 'u1',
      name: 'Ana Lima',
      departmentId: 'd1',
      status: 'FOCUS',
      timer: { startedAt: new Date(Date.now() - 45 * 60_000).toISOString(), card: null },
      inProgress: [
        {
          id: 'c1',
          key: 'NEXA-1',
          number: 1,
          title: 'Login',
          type: 'TASK',
          dueDate: null,
          project: { key: 'NEXA', name: 'Nexa' },
          column: 'Em andamento',
        },
      ],
      hiddenInProgress: 2,
      openCards: 4,
      overdue: 1,
    },
    { ...base, id: 'u2', name: 'Bruno Reis', departmentId: 'd1', status: 'IDLE', isMe: true },
    { ...base, id: 'u3', name: 'Caio', departmentId: null, status: 'ACTIVE', projectIds: [] },
  ],
}

function renderPage() {
  mockApi(({ url = '' }) => {
    if (url === '/team-map') return [200, map]
    throw new Error(`Unexpected request to ${url}`)
  })
  return renderWithProviders(
    <MemoryRouter>
      <TeamMapPage />
    </MemoryRouter>,
  )
}

describe('TeamMapPage', () => {
  it('counts people by status and says which view this is', async () => {
    renderPage()
    expect(await screen.findByText('Visão de membro')).toBeInTheDocument()
    const kpi = (label: string) =>
      screen.getByText(label, { selector: '.team-map__kpi-label' }).closest('button')!
    expect(within(kpi('Pessoas')).getByText('3')).toBeInTheDocument()
    expect(within(kpi('Em foco')).getByText('1')).toBeInTheDocument()
    expect(within(kpi('Sem atividade')).getByText('1')).toBeInTheDocument()
    expect(within(kpi('Com atraso')).getByText('1')).toBeInTheDocument()
  })

  it('opens a person with what they work on, hiding other projects', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: '3D Ana Lima' }))

    const panel = screen.getByRole('dialog', { name: 'Ana Lima' })
    expect(within(panel).getByText(/Timer rodando há 45 min/)).toBeInTheDocument()
    expect(within(panel).getByText(/projeto em que você não está/)).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: /NEXA-1.*Login/ })).toHaveAttribute(
      'href',
      '/p/NEXA/c/1',
    )
    expect(
      within(panel).getByText(/\+ 2 cards em projetos que você não acompanha/),
    ).toBeInTheDocument()
  })

  it('fades people outside the chosen status', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: '3D Ana Lima' })
    await user.click(screen.getByText('Sem atividade', { selector: '.team-map__kpi-label' }))
    expect(screen.getByRole('button', { name: '3D Ana Lima' })).toHaveAttribute(
      'data-dimmed',
      'true',
    )
    expect(screen.getByRole('button', { name: '3D Bruno Reis' })).toHaveAttribute(
      'data-dimmed',
      'false',
    )
  })
})
