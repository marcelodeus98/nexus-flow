import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSessionState, setSession, type Session } from '@/shared/auth/session-store'
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

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

function authorizationOf(call: unknown[]): string | undefined {
  const init = call[1] as RequestInit
  return new Headers(init.headers).get('Authorization') ?? undefined
}

describe('http', () => {
  afterEach(() => setSession(null))

  it('sends the access token', async () => {
    setSession(session('token-1'))
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, { ok: true }))

    await http('/projects')

    expect(authorizationOf(fetchMock.mock.calls[0])).toBe('Bearer token-1')
  })

  it('refreshes an expired access token once and retries', async () => {
    setSession(session('expired'))
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(200, session('token-2')))
      .mockResolvedValueOnce(json(200, { ok: true }))

    await expect(http('/projects')).resolves.toEqual({ ok: true })

    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/refresh')
    expect(authorizationOf(fetchMock.mock.calls[2])).toBe('Bearer token-2')
  })

  it('ends the session when the refresh fails', async () => {
    setSession(session('expired'))
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(401, {}))

    await expect(http('/projects')).rejects.toBeInstanceOf(ApiError)
    expect(getSessionState().status).toBe('anonymous')
  })
})
