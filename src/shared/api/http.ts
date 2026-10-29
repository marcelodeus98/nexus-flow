import { getSessionState, refreshSession } from '@/shared/auth/session-store'
import { env } from '@/shared/config/env'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`Request failed with status ${status}`)
    this.status = status
    this.body = body
  }
}

function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const state = getSessionState()
  if (state.status === 'authenticated' && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${state.session.accessToken}`)
  }
  return fetch(`${env.VITE_API_URL}${path}`, { ...init, credentials: 'include', headers })
}

// Thin fetch wrapper until the OpenAPI client (orval) is generated from the API.
// An expired access token is renewed once and the request retried.
export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await send(path, init)
  if (response.status === 401 && !path.startsWith('/auth/') && (await refreshSession())) {
    response = await send(path, init)
  }
  const body: unknown =
    response.status === 204 ? undefined : await response.json().catch(() => undefined)
  if (!response.ok) throw new ApiError(response.status, body)
  return body as T
}
