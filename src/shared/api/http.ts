import { getSessionState, refreshSession } from '@/shared/auth/session-store'
import { apiClient } from './client'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`Request failed with status ${status}`)
    this.status = status
    this.body = body
  }
}

export type HttpInit = {
  method?: string
  // Already serialized JSON.
  body?: string
  headers?: Record<string, string>
}

function send(path: string, init: HttpInit) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...init.headers }
  const state = getSessionState()
  if (state.status === 'authenticated' && !headers.Authorization) {
    headers.Authorization = `Bearer ${state.session.accessToken}`
  }
  return apiClient.request({ url: path, method: init.method ?? 'GET', data: init.body, headers })
}

// Thin wrapper over axios. An expired access token is renewed once and the
// request retried. Network failures reject with axios' own error (see
// apiErrorMessage).
export async function http<T>(path: string, init: HttpInit = {}): Promise<T> {
  let response = await send(path, init)
  if (response.status === 401 && !path.startsWith('/auth/') && (await refreshSession())) {
    response = await send(path, init)
  }
  if (response.status >= 400) throw new ApiError(response.status, response.data)
  return (response.status === 204 ? undefined : response.data) as T
}
