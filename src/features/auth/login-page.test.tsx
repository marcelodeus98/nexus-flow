import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { getSessionState, setSession } from '@/shared/auth/session-store'
import { theme } from '@/styles/theme'
import { mockApi as mockClient } from '@/test/api'
import { LoginPage } from './login-page'

const json = (status: number, body: unknown): [number, unknown] => [status, body]

function mockApi(loginResponse: [number, unknown], providers = { password: true, google: false }) {
  return mockClient(({ url }) => {
    if (url?.endsWith('/auth/providers')) return [200, providers]
    if (url?.endsWith('/auth/login')) return loginResponse
    throw new Error(`Unexpected request to ${url}`)
  })
}

function renderLogin(initialEntry = '/login') {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <p>Início</p> },
      { path: '/p/NEXA', element: <p>Projeto NEXA</p> },
    ],
    { initialEntries: [initialEntry] },
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <MantineProvider theme={theme}>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  )
}

async function submit(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^E-mail/), email)
  await user.type(screen.getByLabelText(/^Senha/, { selector: 'input' }), password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginPage', () => {
  afterEach(() => setSession(null))

  it('signs in and goes to the requested page', async () => {
    mockApi(
      json(200, {
        accessToken: 'token',
        expiresIn: 900,
        user: { id: 'u1', name: 'Ana', email: 'ana@magistter.com.br', globalRole: 'USER' },
      }),
    )
    renderLogin('/login?next=%2Fp%2FNEXA')

    await submit('ana@magistter.com.br', 'secret-password')

    expect(await screen.findByText('Projeto NEXA')).toBeInTheDocument()
    expect(getSessionState().status).toBe('authenticated')
  })

  it('ignores a next parameter that points to another site', async () => {
    mockApi(json(200, { accessToken: 'token', expiresIn: 900, user: { id: 'u1' } }))
    renderLogin('/login?next=%2F%2Fevil.example')

    await submit('ana@magistter.com.br', 'secret-password')

    expect(await screen.findByText('Início')).toBeInTheDocument()
  })

  it('shows an error for wrong credentials', async () => {
    mockApi(json(401, { message: 'Invalid e-mail or password' }))
    renderLogin()

    await submit('ana@magistter.com.br', 'wrong')

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
  })

  it('offers Google only when the API has it configured', async () => {
    mockApi(json(401, {}), { password: true, google: true })
    renderLogin('/login?error=google_domain')

    expect(await screen.findByRole('link', { name: 'Entrar com Google' })).toHaveAttribute(
      'href',
      '/api/v1/auth/google',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Use sua conta Google corporativa.')
  })
})
