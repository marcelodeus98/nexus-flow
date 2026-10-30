import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Anchor } from '@mantine/core'
import { requestPasswordReset } from './api'
import { AuthCard, Field, FormMessage, SubmitButton } from './auth-card'

export function ForgotPasswordPage() {
  const mutation = useMutation({ mutationFn: requestPasswordReset })

  return (
    <AuthCard
      title="Redefinir senha"
      description="Informe seu e-mail e enviaremos um link para definir uma nova senha."
    >
      {mutation.isSuccess ? (
        <FormMessage tone="info">
          Se o e-mail estiver cadastrado, você vai receber um link para definir a nova senha.
        </FormMessage>
      ) : (
        <form
          className="login-card__form"
          onSubmit={(event) => {
            event.preventDefault()
            mutation.mutate(String(new FormData(event.currentTarget).get('email')))
          }}
        >
          {mutation.isError && (
            <FormMessage tone="error">Não foi possível enviar. Tente novamente.</FormMessage>
          )}
          <Field label="E-mail" name="email" type="email" autoComplete="username" required />
          <SubmitButton pending={mutation.isPending}>Enviar link</SubmitButton>
        </form>
      )}
      <Anchor component={Link} to="/login" className="login-card__link">
        Voltar ao login
      </Anchor>
    </AuthCard>
  )
}
