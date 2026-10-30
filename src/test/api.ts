import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { afterEach, vi } from 'vitest'
import { apiClient } from '@/shared/api/client'

type Reply = [status: number, data: unknown]

// Answers the API client's requests in the test instead of the network:
// `reply` gets each request (url, method, data) and returns [status, body].
export function mockApi(reply: (config: InternalAxiosRequestConfig) => Reply) {
  const adapter = vi.fn<AxiosAdapter>((config) => {
    const [status, data] = reply(config)
    return Promise.resolve({ status, data, statusText: '', headers: {}, config })
  })
  apiClient.defaults.adapter = adapter
  return adapter
}

afterEach(() => {
  apiClient.defaults.adapter = undefined
})
