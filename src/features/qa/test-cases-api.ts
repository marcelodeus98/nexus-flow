import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/shared/api/http'

export type TestStep = { action: string; expected: string | null }

export type TestCase = {
  id: string
  title: string
  preconditions: string | null
  steps: TestStep[]
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export const testCaseKeys = {
  library: (projectId: string, archived: boolean) => ['test-cases', projectId, archived] as const,
}

export function useTestCases(projectId: string, enabled = true, archived = false) {
  return useQuery({
    queryKey: testCaseKeys.library(projectId, archived),
    queryFn: () =>
      http<TestCase[]>(`/projects/${projectId}/test-cases${archived ? '?archived=true' : ''}`),
    enabled,
  })
}

export type TestCaseInput = {
  title?: string
  preconditions?: string | null
  steps?: { action: string; expected?: string }[]
  archived?: boolean
}

export function useSaveTestCase(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: TestCaseInput & { id?: string }) =>
      id
        ? http<TestCase>(`/test-cases/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : http<TestCase>(`/projects/${projectId}/test-cases`, {
            method: 'POST',
            body: JSON.stringify(body),
          }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] }),
  })
}
