import { cloneElement, useId, type ReactElement } from 'react'
import { Label } from '@/shared/ui/label'

// Label + control pair for the admin dialogs; wires htmlFor/id itself.
export function FormField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactElement<{ id?: string }>
}) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, { id })}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
