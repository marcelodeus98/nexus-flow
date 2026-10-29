import { ApiError } from './http'

// RFC 7807 body sent by the API on errors.
export type ProblemDetails = {
  type: string
  title: string
  status: number
  detail?: string
  errors?: unknown
}

const defaults: Record<number, string> = {
  400: 'Verifique os campos e tente de novo.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para isso.',
  404: 'Não encontrado. Talvez tenha sido removido.',
  409: 'Já existe um registro com esses dados.',
  429: 'Muitas tentativas. Aguarde um minuto.',
}

// A message for the user, in Portuguese; pass overrides for statuses whose
// meaning depends on the action (e.g. what a 409 conflicts with).
export function apiErrorMessage(
  error: unknown,
  overrides: Partial<Record<number, string>> = {},
): string {
  if (error instanceof ApiError) {
    return overrides[error.status] ?? defaults[error.status] ?? 'Algo deu errado. Tente de novo.'
  }
  return 'Sem conexão com o servidor. Tente de novo.'
}
