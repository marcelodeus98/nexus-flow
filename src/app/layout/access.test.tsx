import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import type { ProjectListItem, ProjectRole } from '@/features/projects/api'
import { ProjectsPage } from '@/features/projects/projects-page'
import { setSession, type SessionUser } from '@/shared/auth/session-store'
import { mockApi } from '@/test/api'
import { renderWithProviders } from '@/test/render'
import { Sidebar } from './sidebar'

// What a signed-in user sees depending on their global and project roles.

const user = (globalRole: SessionUser['globalRole']): SessionUser => ({
  id: 'u1',
  name: 'Marcelo',
  email: 'marcelo@magistter.com.br',
  jobTitle: null,
  globalRole,
  departmentId: null,
})

const project = (myRole: ProjectRole | null): ProjectListItem => ({
  id: 'p1',
  key: 'NEXA',
  name: 'Nexa',
  description: null,
  methodology: 'KANBAN',
  status: 'ACTIVE',
  defaultEstimateView: 'POINTS',
  defaultBoardId: 'b1',
  createdAt: '2026-11-01T00:00:00.000Z',
  myRole,
})

function signIn(globalRole: SessionUser['globalRole'], projects: ProjectListItem[]) {
  setSession({ accessToken: 't', expiresIn: 900, user: user(globalRole) })
  mockApi(({ url = '' }) => {
    if (url.startsWith('/projects')) return [200, projects]
    throw new Error(`Unexpected request to ${url}`)
  })
}

function renderSidebar(isAdmin: boolean) {
  renderWithProviders(
    <MemoryRouter>
      <Sidebar
        user={{ name: 'Marcelo', role: 'Usuário', initials: 'M' }}
        isAdmin={isAdmin}
        onLogout={() => {}}
        collapsed={false}
        mobileOpen={false}
        onCloseMobile={() => {}}
      />
    </MemoryRouter>,
  )
}

afterEach(() => setSession(null))

describe('access by role', () => {
  it('shows "Novo projeto" only to admins', async () => {
    signIn('USER', [project('MANAGER')])
    const { unmount } = renderWithProviders(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )
    await screen.findByText('Nexa')
    expect(screen.queryByRole('button', { name: /Novo projeto/ })).not.toBeInTheDocument()
    unmount()

    signIn('ADMIN', [])
    renderWithProviders(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('button', { name: /Novo projeto/ })).toBeInTheDocument()
  })

  it('shows Exportações to who can see reports in some project', async () => {
    signIn('USER', [project('DEVELOPER')])
    renderSidebar(false)
    expect(await screen.findByRole('link', { name: /Exportações/ })).toBeInTheDocument()
    // Everyone follows the testing queue.
    expect(screen.getByRole('link', { name: /Fila de testes/ })).toBeInTheDocument()
  })

  it('hides Exportações from viewers and people without projects', async () => {
    signIn('USER', [project('VIEWER')])
    renderSidebar(false)
    await screen.findByText('Nexa') // the projects loaded
    expect(screen.queryByRole('link', { name: /Exportações/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Fila de testes/ })).toBeInTheDocument()
  })

  it('shows Exportações to admins without projects', () => {
    signIn('ADMIN', [])
    renderSidebar(true)
    expect(screen.getByRole('link', { name: /Exportações/ })).toBeInTheDocument()
  })
})
