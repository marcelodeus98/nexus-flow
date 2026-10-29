import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setSession } from '@/shared/auth/session-store'
import type { User } from './api'
import { UsersPage } from './users-page'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

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

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <UsersPage />
    </QueryClientProvider>,
  )
}

describe('UsersPage', () => {
  let users: User[]
  let fetchMock: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setSession({ accessToken: 't', expiresIn: 900, user: ana })
    users = [ana]
    fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.startsWith('/api/v1/users') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Partial<User>
        const created = { ...ana, ...body, id: 'u2', department: null, globalRole: 'USER' as const }
        users = [...users, created]
        return json(201, created)
      }
      if (url.startsWith('/api/v1/users')) return json(200, { items: users, nextCursor: null })
      if (url.startsWith('/api/v1/departments')) return json(200, [])
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
    await user.type(within(dialog).getByLabelText('Nome'), 'Bruno Reis')
    await user.type(within(dialog).getByLabelText('E-mail'), 'bruno@magistter.com.br')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Bruno Reis')).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(
      ([, init]: unknown[]) => (init as RequestInit | undefined)?.method === 'POST',
    )!
    expect(JSON.parse(String(post[1]!.body))).toEqual({
      name: 'Bruno Reis',
      email: 'bruno@magistter.com.br',
      jobTitle: null,
      departmentId: null,
      globalRole: 'USER',
    })
  })
})
