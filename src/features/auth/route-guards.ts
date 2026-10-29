import { redirect, type LoaderFunctionArgs } from 'react-router'
import { ensureSession, getSessionState } from '@/shared/auth/session-store'

// Loader of the authenticated part of the app: no session, go to login and
// come back afterwards.
export async function requireSession({ request }: LoaderFunctionArgs) {
  if (await ensureSession()) return null
  const url = new URL(request.url)
  const next = url.pathname + url.search
  throw redirect(next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`)
}

// The API is the authority (it answers 403); this only keeps non-admins out
// of pages whose every action they would be refused.
export async function requireAdmin(args: LoaderFunctionArgs) {
  await requireSession(args)
  const state = getSessionState()
  if (state.status === 'authenticated' && state.session.user.globalRole !== 'ADMIN') {
    throw redirect('/')
  }
  return null
}

// Loader of the login pages: someone already signed in skips them.
export async function redirectIfSignedIn() {
  if (await ensureSession()) throw redirect('/')
  return null
}
