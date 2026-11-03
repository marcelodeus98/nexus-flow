import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '@/shared/api/http'
import { Anchor } from '@mantine/core'
import { login } from './api'
import { AuthCard, Field, FormMessage, SubmitButton } from './auth-card'

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return 'E-mail ou senha inválidos.'
  if (error instanceof ApiError && error.status === 429)
    return 'Muitas tentativas. Aguarde um minuto e tente de novo.'
  return 'Não foi possível entrar. Tente novamente.'
}

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: () => navigate(safeNext(params.get('next')), { replace: true }),
  })

  return (
    <AuthCard
      title="Entrar"
      description="Use seu e-mail e senha para acessar o Nexa Flow. Sem cadastro? Fale com um administrador."
    >
      {params.get('reset') === 'ok' && (
        <FormMessage tone="info">Senha alterada. Entre com a nova senha.</FormMessage>
      )}
      {mutation.isError && (
        <FormMessage tone="error">{loginErrorMessage(mutation.error)}</FormMessage>
      )}

      <form
        className="login-card__form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          mutation.mutate({
            email: String(form.get('email')),
            password: String(form.get('password')),
          })
        }}
      >
        <Field label="E-mail" name="email" type="email" autoComplete="username" required />
        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <SubmitButton pending={mutation.isPending}>
          {mutation.isPending ? 'Entrando…' : 'Entrar'}
        </SubmitButton>
        <Anchor component={Link} to="/forgot-password" className="login-card__link" ta="center">
          Esqueci minha senha
        </Anchor>
      </form>
    </AuthCard>
  )
}

// Only same-app paths, so ?next= cannot send the user to another site.
function safeNext(next: string | null): string {
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/'
}
