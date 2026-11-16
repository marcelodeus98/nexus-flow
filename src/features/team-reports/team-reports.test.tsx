import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/api'
import { renderWithProviders } from '@/test/render'
import type { Overview, TeamMemberRow, TeamReport } from './api'
import { OverviewPage } from './overview-page'
import { TeamReportPage } from './team-report-page'

const severities = { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0 }

const member = (over: Partial<TeamMemberRow>): TeamMemberRow => ({
  id: 'u1',
  name: 'Ana Lima',
  email: 'ana@magistter.com.br',
  jobTitle: 'Dev',
  isActive: true,
  isLeader: false,
  seconds: 5400,
  entries: 1,
  cardsDone: 1,
  pointsDone: 3,
  estimateMinutesDone: 60,
  actualMinutesDone: 90,
  deviationPct: 50,
  openCards: 2,
  inProgress: 1,
  overdue: 1,
  openBugs: 0,
  approvalsReceived: 1,
  rejectionsReceived: 1,
  rejectionRate: 50,
  approvedCards: 1,
  firstPassYield: 0,
  avgRework: 1,
  approvalsGiven: 0,
  rejectionsGiven: 0,
  testsPassed: 0,
  testsFailed: 0,
  testsBlocked: 0,
  bugsReported: 0,
  bugsFoundInTheirCards: 1,
  ...over,
})

const report: TeamReport = {
  team: { id: 't1', name: 'Desenvolvimento', description: null, leader: { id: 'l1', name: 'Leo' } },
  filter: { from: '2026-11-01', to: '2026-11-16' },
  totals: {
    members: 2,
    seconds: 5400,
    entries: 1,
    cardsDone: 1,
    pointsDone: 3,
    estimateMinutesDone: 60,
    actualMinutesDone: 90,
    deviationPct: 50,
    openCards: 3,
    inProgress: 1,
    overdue: 1,
    openBugs: 0,
  },
  quality: {
    reviews: 2,
    approved: 1,
    rejected: 1,
    rejectionRate: 50,
    firstPassYield: 0,
    avgRework: 1,
    tests: { passed: 0, failed: 0, blocked: 0 },
    bugsReported: 1,
    bugsReportedBySeverity: severities,
    bugsFoundInTeamCards: 1,
    bugsFoundBySeverity: severities,
  },
  members: [member({}), member({ id: 'u2', name: 'Bruno Reis', seconds: 0, cardsDone: 0 })],
  leaderIsMember: false,
  projects: [
    {
      id: 'p1',
      key: 'NEXA',
      name: 'Nexa',
      status: 'ACTIVE',
      seconds: 5400,
      cardsDone: 1,
      openCards: 3,
    },
  ],
  days: [{ day: '2026-11-16', seconds: 5400 }],
}

describe('TeamReportPage', () => {
  it("shows the team's totals and each member", async () => {
    const api = mockApi(({ url = '' }) => {
      if (url === '/team-reports/teams')
        return [200, [{ id: 't1', name: 'Desenvolvimento', leader: null, memberCount: 2 }]]
      if (url.startsWith('/team-reports/t1')) return [200, report]
      throw new Error(`Unexpected request to ${url}`)
    })
    renderWithProviders(
      <MemoryRouter>
        <TeamReportPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Ana Lima')).toBeInTheDocument()
    expect(screen.getByText('Bruno Reis')).toBeInTheDocument()
    expect(screen.getByText(/Leo lidera o time sem ser membro/)).toBeInTheDocument()
    const row = screen.getByText('Ana Lima').closest('tr')!
    expect(within(row).getByText('+50%')).toBeInTheDocument()
    expect(api.mock.calls.some(([c]) => c.url?.startsWith('/team-reports/t1?from='))).toBe(true)

    await userEvent.setup().click(screen.getByRole('radio', { name: 'Projetos' }))
    expect(await screen.findByText('Nexa')).toBeInTheDocument()
  })

  it('explains when the user leads no team', async () => {
    mockApi(({ url = '' }) => {
      if (url === '/team-reports/teams') return [200, []]
      throw new Error(`Unexpected request to ${url}`)
    })
    renderWithProviders(
      <MemoryRouter>
        <TeamReportPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/Você não lidera nenhum time/)).toBeInTheDocument()
  })
})

describe('OverviewPage', () => {
  it('lists projects, teams and people', async () => {
    const work = { seconds: 3600, cardsDone: 2, openCards: 1, overdue: 0 }
    const overview: Overview = {
      filter: { from: '2026-11-01', to: '2026-11-16' },
      totals: {
        projects: 1,
        people: 1,
        teams: 1,
        seconds: 3600,
        cardsDone: 2,
        openCards: 1,
        overdue: 0,
        openBugs: 0,
        reviews: 0,
        rejectionRate: null,
      },
      projects: [
        {
          ...work,
          id: 'p1',
          key: 'NEXA',
          name: 'Nexa',
          methodology: 'SCRUM',
          members: 4,
          activeSprint: { name: 'Sprint 3', endDate: '2026-11-20' },
          inProgress: 1,
          openBugs: 0,
          bugsFixed: 0,
          approved: 0,
          rejected: 0,
          rejectionRate: null,
        },
      ],
      teams: [{ ...work, id: 't1', name: 'Produto', leader: null, members: 3 }],
      people: [{ ...work, id: 'u1', name: 'Ana Lima', jobTitle: null, department: null }],
      days: [],
    }
    mockApi(({ url = '' }) => {
      if (url.startsWith('/reports/overview')) return [200, overview]
      throw new Error(`Unexpected request to ${url}`)
    })
    const user = userEvent.setup()
    renderWithProviders(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Sprint 3 (até 20/11)')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Times' }))
    expect(await screen.findByRole('link', { name: 'Produto' })).toHaveAttribute(
      'href',
      expect.stringContaining('/team-reports?team=t1'),
    )
    await user.click(screen.getByRole('radio', { name: 'Pessoas' }))
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument()
  })
})
