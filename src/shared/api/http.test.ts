import { afterEach, describe, expect, it } from 'vitest'
import { getSessionState, setSession, type Session } from '@/shared/auth/session-store'
import { mockApi } from '@/test/api'
import { ApiError, http } from './http'

const session = (accessToken: string): Session => ({
  accessToken,
  expiresIn: 900,
  user: {
    id: 'u1',
    name: 'Ana',
    email: 'ana@magistter.com.br',
    jobTitle: null,
    globalRole: 'USER',
    departmentId: null,
  },
})

// Answers each request with the next canned response, in order.
const replies = (...responses: [number, unknown][]) =>
  mockApi(() => (responses.shift() ?? [500, null]) as [number, unknown])

const callOf = (adapter: ReturnType<typeof replies>, index: number) => adapter.mock.calls[index][0]

describe('http', () => {
  afterEach(() => setSession(null))

  it('sends the access token', async () => {
    setSession(session('token-1'))
    const adapter = replies([200, { ok: true }])

    await http('/projects')

    expect(callOf(adapter, 0).headers.Authorization).toBe('Bearer token-1')
  })

  it('refreshes an expired access token once and retries', async () => {
    setSession(session('expired'))
    const adapter = replies([401, {}], [200, session('token-2')], [200, { ok: true }])

    await expect(http('/projects')).resolves.toEqual({ ok: true })

    expect(callOf(adapter, 1).url).toBe('/auth/refresh')
    expect(callOf(adapter, 2).headers.Authorization).toBe('Bearer token-2')
  })

  it('ends the session when the refresh fails', async () => {
    setSession(session('expired'))
    replies([401, {}], [401, {}])

    await expect(http('/projects')).rejects.toBeInstanceOf(ApiError)
    expect(getSessionState().status).toBe('anonymous')
  })
})
