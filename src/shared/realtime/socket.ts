import { io, type Socket } from 'socket.io-client'
import { getSessionState, refreshSession } from '@/shared/auth/session-store'
import { env } from '@/shared/config/env'

// Same server as the REST API: its origin when VITE_API_URL is absolute
// (API on another domain), otherwise the page's own origin.
const apiOrigin = /^https?:\/\//.test(env.VITE_API_URL)
  ? new URL(env.VITE_API_URL).origin
  : undefined

// One Socket.IO connection per tab, opened on first use. The API checks the
// access token on connect; `auth` is a function so every reconnect sends the
// current token, and an `auth.failed` triggers a refresh and a new attempt.
let socket: Socket | undefined

export function getSocket(): Socket {
  if (socket) return socket
  socket = io(apiOrigin, {
    path: '/socket.io',
    transports: ['websocket'],
    auth: (send) => {
      const state = getSessionState()
      send({ token: state.status === 'authenticated' ? state.session.accessToken : null })
    },
  })
  socket.on('auth.failed', async () => {
    if (await refreshSession()) socket?.connect()
  })
  return socket
}

export function closeSocket() {
  socket?.disconnect()
  socket = undefined
}
