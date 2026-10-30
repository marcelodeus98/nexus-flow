import { Alert, Button, PasswordInput, Stack, TextInput } from '@mantine/core'
import { useId, type ReactNode } from 'react'
import eclipseImage from '@/assets/auth/login-eclipse.png'
import heroImage from '@/assets/auth/login-hero.webp'
import raysImage from '@/assets/auth/login-rays.png'
import { BrandLogo } from '@/shared/brand/brand-logo'
import './auth-layout.css'

// Frame of the public auth screens, the same as Nexa Assets': the form on
// the left with the logo, the photo over the teal block on the right. Below
// 960px only the form stays.
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <main className="login-page">
      <img className="login-page__eclipse" src={eclipseImage} alt="" />
      <section className="login-page__form-panel" aria-labelledby={titleId}>
        <img className="login-page__rays-bottom" src={raysImage} alt="" />
        <header className="login-page__brand">
          <BrandLogo size={48} />
        </header>
        <div className="login-page__form-body">
          <div className="login-card">
            <header className="login-card__header">
              <h1 id={titleId}>{title}</h1>
              {description && <p>{description}</p>}
            </header>
            <Stack className="login-card__fields" gap="lg">
              {children}
            </Stack>
          </div>
        </div>
      </section>
      <aside className="login-page__visual" aria-hidden="true">
        <img className="login-page__hero" src={heroImage} alt="" />
      </aside>
    </main>
  )
}

type FieldProps = {
  label: string
  name: string
  type: 'email' | 'password'
  autoComplete: string
  required?: boolean
  minLength?: number
  maxLength?: number
}

export function Field({ type, ...input }: FieldProps) {
  return type === 'password' ? (
    <PasswordInput size="md" {...input} />
  ) : (
    <TextInput type={type} size="md" {...input} />
  )
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <Button type="submit" size="md" fullWidth loading={pending} mt="xs">
      {children}
    </Button>
  )
}

export function FormMessage({ tone, children }: { tone: 'error' | 'info'; children: ReactNode }) {
  return (
    <Alert
      role={tone === 'error' ? 'alert' : 'status'}
      color={tone === 'error' ? 'red' : 'brand'}
      variant="light"
      p="xs"
    >
      {children}
    </Alert>
  )
}
