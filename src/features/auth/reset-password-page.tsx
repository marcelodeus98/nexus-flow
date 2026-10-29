import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { resetPassword } from './api'
import { AuthCard, Field, FormMessage, SubmitButton } from './auth-card'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [mismatch, setMismatch] = useState(false)
  const mutation = useMutation({
    mutationFn: (password: string) => resetPassword(token, password),
    onSuccess: () => navigate('/login?reset=ok', { replace: true }),
  })

  return (
    <AuthCard title="Nova senha">
      {(!token || mutation.isError) && (
        <FormMessage tone="error">
          Link inválido ou expirado.{' '}
          <Link to="/forgot-password" className="underline">
            Peça um novo
          </Link>
          .
        </FormMessage>
      )}
      {mismatch && <FormMessage tone="error">As senhas não conferem.</FormMessage>}
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          const password = String(form.get('password'))
          const matches = password === String(form.get('confirmation'))
          setMismatch(!matches)
          if (matches) mutation.mutate(password)
        }}
      >
        <Field
          label="Nova senha"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
        <Field
          label="Confirme a nova senha"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
        />
        <SubmitButton pending={mutation.isPending || !token}>Salvar senha</SubmitButton>
      </form>
    </AuthCard>
  )
}
