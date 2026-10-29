import { toast } from 'sonner'
import { apiErrorMessage } from '@/shared/api/errors'
import { Checkbox } from '@/shared/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { typeLabels, usePreferences, useSetPreferences, type Preference } from './api'

// Each kind of notification, in the app and/or by e-mail. Saved on change.
export function NotificationPreferencesPage() {
  const preferences = usePreferences()
  const save = useSetPreferences()

  function toggle(preference: Preference, channel: 'inApp' | 'email', value: boolean) {
    save.mutate([{ ...preference, [channel]: value }], {
      onError: (error) => toast.error(apiErrorMessage(error)),
    })
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Notificações</h1>
        <p className="text-sm text-muted-foreground">
          Escolha o que você recebe no Nexa Flow e o que também chega por e-mail.
        </p>
      </div>
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead className="w-24 text-center">No app</TableHead>
              <TableHead className="w-24 text-center">E-mail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preferences.data?.map((preference) => (
              <TableRow key={preference.type}>
                <TableCell>{typeLabels[preference.type]}</TableCell>
                {(['inApp', 'email'] as const).map((channel) => (
                  <TableCell key={channel} className="text-center">
                    <Checkbox
                      checked={preference[channel]}
                      disabled={save.isPending}
                      aria-label={`${typeLabels[preference.type]}: ${channel === 'inApp' ? 'no app' : 'e-mail'}`}
                      onCheckedChange={(checked) => toggle(preference, channel, checked === true)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
