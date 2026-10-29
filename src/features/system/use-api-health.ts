import { useQuery } from '@tanstack/react-query'
import { http } from '@/shared/api/http'

type HealthResponse = {
  status: 'ok' | 'error' | 'shutting_down'
  info?: Record<string, { status: 'up' | 'down' }>
}

export function useApiHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => http<HealthResponse>('/health'),
    refetchInterval: 30_000,
  })
}
