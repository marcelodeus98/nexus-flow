import { roleLabels, type ProjectRole } from '@/features/projects/api'
import { ApiError } from '@/shared/api/http'
import { apiErrorMessage } from '@/shared/api/errors'

type RuleFailure = {
  type: 'CHECKLIST_COMPLETE' | 'REQUIRED_FIELDS' | 'ROLE_REQUIRED' | 'WIP_LIMIT'
  missingFields?: string[]
  checklistKind?: 'QA' | 'GENERAL' | null
  roles?: ProjectRole[]
  wipLimit?: number
}

export const requirableFieldLabels: Record<string, string> = {
  storyPoints: 'story points',
  estimateMinutes: 'estimativa em horas',
  dueDate: 'prazo',
  description: 'descrição',
  assignees: 'responsável',
  tags: 'tag',
  departments: 'departamento',
}

function describe(failure: RuleFailure): string {
  switch (failure.type) {
    case 'REQUIRED_FIELDS':
      return `Preencha: ${(failure.missingFields ?? [])
        .map((field) => requirableFieldLabels[field] ?? field)
        .join(', ')}.`
    case 'CHECKLIST_COMPLETE':
      return failure.checklistKind === 'QA'
        ? 'O checklist de QA precisa existir e estar completo.'
        : 'O checklist precisa existir e estar completo.'
    case 'ROLE_REQUIRED':
      return `Só ${(failure.roles ?? []).map((role) => roleLabels[role]).join(' ou ')} pode mover para esta coluna.`
    case 'WIP_LIMIT':
      return `A coluna já está no limite de ${failure.wipLimit} cards.`
  }
}

// A failed move: the board's rules (422) say what is missing; a 409 means the
// board changed under the user.
export function moveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 422) {
    const failures = (error.body as { errors?: RuleFailure[] } | undefined)?.errors ?? []
    return ['Movimento bloqueado pelas regras do board.', ...failures.map(describe)].join(' ')
  }
  if (error instanceof ApiError && error.status === 409) {
    return 'O board mudou enquanto você movia. Atualizamos para a versão atual.'
  }
  return apiErrorMessage(error)
}
