import { useSyncExternalStore } from 'react'
import { env } from '@/shared/config/env'

export type SessionUser = {
  id: string
  name: string
  email: string
  jobTitle: string | null
  globalRole: 'ADMIN' | 'USER'
  departmentId: string | null
}

export type Session = {
  accessToken: string
  expiresIn: number
  user: SessionUser
}

// The access token lives only in memory. On a page load the session is
// restored from the httpOnly refresh cookie, which JavaScript cannot read.
type SessionState =
  { status: 'unknown' } | { status: 'anonymous' } | { status: 'authenticated'; session: Session }

let state: SessionState = { status: 'unknown' }
let pendingRefresh: Promise<Session | null> | undefined
const listeners = new Set<() => void>()

export function getSessionState(): SessionState {
  return state
}

export function setSession(session: Session | null) {
  state = session ? { status: 'authenticated', session } : { status: 'anonymous' }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSessionState(): SessionState {
  return useSyncExternalStore(subscribe, getSessionState)
}

// Single flight: concurrent 401s and StrictMode double effects share one call,
// so the API never sees the same refresh token twice from this tab.
export function refreshSession(): Promise<Session | null> {
  pendingRefresh ??= fetch(`${env.VITE_API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (response) => (response.ok ? ((await response.json()) as Session) : null))
    .catch(() => null)
    .then((session) => {
      setSession(session)
      return session
    })
    .finally(() => {
      pendingRefresh = undefined
    })
  return pendingRefresh
}

// Resolves the session once per page load; later calls reuse what is known.
export async function ensureSession(): Promise<Session | null> {
  const current = getSessionState()
  if (current.status === 'authenticated') return current.session
  if (current.status === 'anonymous') return null
  return refreshSession()
}
