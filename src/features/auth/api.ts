import { http } from '@/shared/api/http'
import { setSession, type Session } from '@/shared/auth/session-store'
import { closeSocket } from '@/shared/realtime/socket'

export async function login(email: string, password: string): Promise<Session> {
  const session = await http<Session>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setSession(session)
  return session
}

export async function logout(): Promise<void> {
  try {
    await http<void>('/auth/logout', { method: 'POST' })
  } finally {
    closeSocket()
    setSession(null)
  }
}

export function requestPasswordReset(email: string): Promise<void> {
  return http<void>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(token: string, password: string): Promise<void> {
  return http<void>('/auth/password/reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}
