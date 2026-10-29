import { AuditLog } from '@/features/audit/audit-log'

export function AdminAuditPage() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Tudo o que foi feito no sistema, do mais recente ao mais antigo. O registro não pode ser
        alterado nem apagado.
      </p>
      <AuditLog source="/audit" />
    </div>
  )
}
