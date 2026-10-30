import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setSession } from '@/shared/auth/session-store'
import { mockApi } from '@/test/api'
import { renderWithProviders } from '@/test/render'
import type { User } from './api'
import { UsersPage } from './users-page'

const ana: User = {
  id: 'u1',
  name: 'Ana Lima',
  email: 'ana@magistter.com.br',
  jobTitle: 'Tech Lead',
  globalRole: 'ADMIN',
  isActive: true,
  departmentId: 'd1',
  department: { id: 'd1', name: 'Desenvolvimento', color: '#2563EB' },
  hasPassword: true,
  hasGoogle: false,
  createdAt: '2026-10-28T00:00:00.000Z',
}

const renderPage = () => renderWithProviders(<UsersPage />)

describe('UsersPage', () => {
  let users: User[]
  let api: ReturnType<typeof mockApi>

  beforeEach(() => {
    setSession({ accessToken: 't', expiresIn: 900, user: ana })
    users = [ana]
    api = mockApi(({ url = '', method, data }) => {
      if (url.startsWith('/users') && method === 'post') {
        const body = JSON.parse(String(data)) as Partial<User>
        const created = { ...ana, ...body, id: 'u2', department: null, globalRole: 'USER' as const }
        users = [...users, created]
        return [201, created]
      }
      if (url.startsWith('/users')) return [200, { items: users, nextCursor: null }]
      if (url.startsWith('/departments')) return [200, []]
      throw new Error(`Unexpected request to ${url}`)
    })
  })

  afterEach(() => setSession(null))

  it('lists users with department and role', async () => {
    renderPage()

    const row = (await screen.findByText('Ana Lima')).closest('tr')!
    expect(within(row).getByText('Desenvolvimento')).toBeInTheDocument()
    expect(within(row).getByText('Administrador')).toBeInTheDocument()
  })

  it('creates a user and refreshes the list', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Lima')

    await user.click(screen.getByRole('button', { name: /Novo usuário/ }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('textbox', { name: /Nome/ }), 'Bruno Reis')
    await user.type(
      within(dialog).getByRole('textbox', { name: /E-mail/ }),
      'bruno@magistter.com.br',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Bruno Reis')).toBeInTheDocument()
    const post = api.mock.calls.find(([config]) => config.method === 'post')!
    expect(JSON.parse(String(post[0].data))).toEqual({
      name: 'Bruno Reis',
      email: 'bruno@magistter.com.br',
      jobTitle: null,
      departmentId: null,
      globalRole: 'USER',
    })
  })
})
