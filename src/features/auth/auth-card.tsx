import { useId, type ComponentProps, type ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardDescription className="font-semibold text-primary">Nexa Flow</CardDescription>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </div>
  )
}

export function Field({ label, ...input }: { label: string } & ComponentProps<typeof Input>) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...input} />
    </div>
  )
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {children}
    </Button>
  )
}

export function FormMessage({ tone, children }: { tone: 'error' | 'info'; children: ReactNode }) {
  const colors =
    tone === 'error'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700'
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-3 py-2 text-sm ${colors}`}
    >
      {children}
    </p>
  )
}
