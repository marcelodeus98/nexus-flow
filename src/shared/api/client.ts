import axios from 'axios'
import { env } from '@/shared/config/env'

// The one axios instance. Every status resolves (validateStatus): `http()`
// decides what is an error, so a 401 can be refreshed and retried.
export const apiClient = axios.create({
  baseURL: env.VITE_API_URL,
  withCredentials: true,
  validateStatus: () => true,
})
