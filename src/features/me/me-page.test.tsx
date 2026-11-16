import { screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/api'
import { renderWithProviders } from '@/test/render'
import type { Daily, DailyCard, Profile } from './api'
import { MePage } from './me-page'

const card = (over: Partial<DailyCard>): DailyCard => ({
  id: 'c1',
  key: 'NEXA-1',
  number: 1,
  title: 'Login',
  type: 'TASK',
  priority: 'MEDIUM',
  dueDate: null,
  qaStatus: null,
  storyPoints: null,
  project: { key: 'NEXA', name: 'Nexa' },
  column: 'Em andamento',
  category: 'IN_PROGRESS',
  sprint: null,
  severity: null,
  ...over,
})

const profile: Profile = {
  id: 'u1',
  name: 'Ana Lima',
  email: 'ana@magistter.com.br',
  jobTitle: 'Desenvolvedora',
  globalRole: 'USER',
  createdAt: '2026-10-01T00:00:00.000Z',
  department: { name: 'Desenvolvimento', color: '#2563EB' },
  teams: [{ id: 't1', name: 'Squad Web', isLeader: true }],
  ledTeams: [],
}

const late = card({ id: 'c2', key: 'NEXA-2', number: 2, title: 'Relatório', dueDate: '2026-11-13' })
const daily: Daily = {
  date: '2026-11-16',
  previousDate: '2026-11-13',
  previous: {
    seconds: 7200,
    completed: [
      {
        ...card({ id: 'c3', key: 'NEXA-3', number: 3, title: 'Cadastro' }),
        seconds: 0,
        moves: [],
        reviews: [],
        completed: true,
      },
    ],
    worked: [],
  },
  today: { seconds: 0, completed: [], worked: [], running: null },
  open: { total: 2, inProgress: [card({}), late], todo: [], backlog: [] },
  attention: { overdue: [late], dueToday: [], rejected: [], openBugs: [] },
}

describe('MePage', () => {
  it('shows the profile and the daily, with links to the cards', async () => {
    mockApi(({ url = '' }) => {
      if (url === '/me/profile') return [200, profile]
      if (url.startsWith('/me/daily')) return [200, daily]
      if (url.startsWith('/projects')) return [200, []]
      throw new Error(`Unexpected request to ${url}`)
    })
    renderWithProviders(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Ana Lima' })).toBeInTheDocument()
    expect(screen.getByText('Squad Web')).toBeInTheDocument()
    // Monday: the window starts on Friday.
    expect(await screen.findByRole('heading', { name: 'Desde sex, 13/11' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /NEXA-3.*Cadastro/ })).toHaveAttribute(
      'href',
      '/p/NEXA/c/3',
    )
    const attention = screen
      .getByRole('heading', { name: 'Atenção' })
      .closest('.mantine-Paper-root')!
    expect(within(attention as HTMLElement).getByText(/atrasado/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Copiar resumo/ })).toBeInTheDocument()
  })
})
