import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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
  createdAt: '2026-10-28T00:00:00.000Z',
}

const carla: User = {
  ...ana,
  id: 'u3',
  name: 'Carla Dias',
  email: 'carla@magistter.com.br',
  globalRole: 'USER',
}

const renderPage = () =>
  renderWithProviders(
    <MemoryRouter>
      <UsersPage />
    </MemoryRouter>,
  )

async function openEdit(name: string) {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText(name)
  await user.click(screen.getByRole('button', { name: `Ações de ${name}` }))
  await user.click(await screen.findByRole('menuitem', { name: 'Editar' }))
  return { user, dialog: await screen.findByRole('dialog') }
}

const carlaOverview = {
  ...{
    id: 'u3',
    name: 'Carla Dias',
    email: 'carla@magistter.com.br',
    jobTitle: 'QA',
    globalRole: 'USER',
    isActive: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    hasPassword: true,
    department: null,
  },
  teams: [{ id: 't1', name: 'Squad Web', isLeader: true }],
  ledTeams: [{ id: 't1', name: 'Squad Web' }],
  projects: [
    {
      id: 'p1',
      key: 'NEXA',
      name: 'Nexa',
      status: 'ACTIVE',
      role: 'QA',
      direct: false,
      teams: ['Squad Web'],
    },
  ],
  work: { status: 'IDLE', timer: null, inProgress: [], openCards: 2, overdue: 1 },
  todaySeconds: 0,
  weekSeconds: 7200,
  lastActivityAt: null,
  activity: [],
  history: [
    {
      id: 'a1',
      action: 'user.password_changed',
      actor: 'Ana Lima',
      metadata: { notified: true },
      createdAt: '2026-11-10T12:00:00.000Z',
    },
  ],
}

describe('UsersPage', () => {
  let users: User[]
  let api: ReturnType<typeof mockApi>

  beforeEach(() => {
    setSession({ accessToken: 't', expiresIn: 900, user: ana })
    users = [ana, carla]
    api = mockApi(({ url = '', method, data }) => {
      if (url.endsWith('/password') && method === 'put') return [200, carla]
      if (url === '/users/u3/overview') return [200, carlaOverview]
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

  const putRequest = () =>
    waitFor(() => {
      const call = api.mock.calls.find(([config]) => config.method === 'put')
      expect(call).toBeDefined()
      return call!
    })

  it('lists users with department and role', async () => {
    renderPage()

    const row = (await screen.findByText('Ana Lima')).closest('tr')!
    expect(within(row).getByText('Desenvolvimento')).toBeInTheDocument()
    expect(within(row).getByText('Administrador')).toBeInTheDocument()
  })

  it('generates a password for another user and e-mails it', async () => {
    const { user, dialog } = await openEdit('Carla Dias')
    const save = within(dialog).getByRole('button', { name: /Salvar e enviar por e-mail/ })
    expect(save).toBeDisabled()

    await user.click(within(dialog).getByRole('button', { name: /Gerar/ }))
    const input = within(dialog).getByLabelText(/Nova senha/) as HTMLInputElement
    expect(input.value).toHaveLength(16)
    expect(within(dialog).getByRole('button', { name: /Copiar senha/ })).toBeEnabled()

    await user.click(save)
    const put = await putRequest()
    expect(put[0].url).toBe('/users/u3/password')
    expect(JSON.parse(String(put[0].data))).toEqual({ password: input.value, notify: true })
  })

  it('saves a typed password without e-mail', async () => {
    const { user, dialog } = await openEdit('Carla Dias')
    await user.type(within(dialog).getByLabelText(/Nova senha/), 'senha-digitada')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar senha' }))

    const put = await putRequest()
    expect(JSON.parse(String(put[0].data))).toEqual({ password: 'senha-digitada', notify: false })
  })

  it('opens a read-only view from the row, with Editar inside', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByText('Carla Dias'))

    const drawer = await screen.findByRole('dialog')
    expect(await within(drawer).findByText('Squad Web')).toBeInTheDocument()
    expect(within(drawer).getByText(/QA · via Squad Web/)).toBeInTheDocument()
    expect(within(drawer).getByText('Senha trocada por administrador')).toBeInTheDocument()
    expect(within(drawer).getByText(/por Ana Lima/)).toBeInTheDocument()

    await user.click(within(drawer).getByRole('button', { name: /Editar/ }))
    expect(await screen.findByText('Editar usuário')).toBeInTheDocument()
  })

  it('does not offer to change your own password here', async () => {
    const { dialog } = await openEdit('Ana Lima')
    expect(within(dialog).queryByLabelText(/Nova senha/)).not.toBeInTheDocument()
    expect(within(dialog).getByText(/Esqueci minha senha/)).toBeInTheDocument()
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
