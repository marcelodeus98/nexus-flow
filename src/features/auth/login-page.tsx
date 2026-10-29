import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '@/shared/api/http'
import { Button } from '@/shared/ui/button'
import { googleSignInUrl, login, useAuthProviders } from './api'
import { AuthCard, Field, FormMessage, SubmitButton } from './auth-card'

// Codes the API puts in ?error= when Google sign-in fails.
const googleErrors: Record<string, string> = {
  google_failed: 'Não foi possível entrar com o Google. Tente novamente.',
  google_domain: 'Use sua conta Google corporativa.',
  google_not_registered: 'Sua conta ainda não tem acesso. Peça a um administrador.',
}

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return 'E-mail ou senha inválidos.'
  if (error instanceof ApiError && error.status === 429)
    return 'Muitas tentativas. Aguarde um minuto e tente de novo.'
  return 'Não foi possível entrar. Tente novamente.'
}

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const providers = useAuthProviders()
  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: () => navigate(safeNext(params.get('next')), { replace: true }),
  })

  const urlError = googleErrors[params.get('error') ?? '']
  const passwordEnabled = providers.data?.password ?? true

  return (
    <AuthCard title="Entrar">
      {urlError && <FormMessage tone="error">{urlError}</FormMessage>}
      {params.get('reset') === 'ok' && (
        <FormMessage tone="info">Senha alterada. Entre com a nova senha.</FormMessage>
      )}
      {mutation.isError && (
        <FormMessage tone="error">{loginErrorMessage(mutation.error)}</FormMessage>
      )}

      {passwordEnabled && (
        <form
          className="space-y-4"
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
          <Button variant="link" asChild className="w-full">
            <Link to="/forgot-password">Esqueci minha senha</Link>
          </Button>
        </form>
      )}

      {providers.data?.google && (
        <Button variant="outline" size="lg" asChild className="w-full">
          <a href={googleSignInUrl}>Entrar com Google</a>
        </Button>
      )}
    </AuthCard>
  )
}

// Only same-app paths, so ?next= cannot send the user to another site.
function safeNext(next: string | null): string {
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/'
}
