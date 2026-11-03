import {
  Alert,
  Anchor,
  Button,
  Group,
  NumberInput,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { IconInfoCircle, IconMailForward } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { HelpLink } from '@/features/help/help-link'
import { apiErrorMessage } from '@/shared/api/errors'
import { ApiError } from '@/shared/api/http'
import { confirmDanger } from '@/shared/notify/confirm'
import { toast } from '@/shared/notify/toast'
import {
  useMailSettings,
  useRemoveMailSettings,
  useSaveMailSettings,
  useTestMail,
  type MailSettingsView,
} from './api'

type Form = {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  fromAddress: string
}

const blank: Form = {
  host: '',
  port: 587,
  secure: false,
  username: '',
  password: '',
  fromAddress: 'Nexa Flow <no-reply@empresa.com.br>',
}

function formOf(view: MailSettingsView): Form {
  const current = view.settings ?? view.env
  if (!current) return blank
  return {
    host: current.host,
    port: current.port,
    secure: current.secure,
    username: current.username ?? '',
    password: '',
    fromAddress: current.fromAddress,
  }
}

// The server's own answer comes in `detail` (auth failed, connection refused...).
function testErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 422) {
    const detail = (error.body as { detail?: string } | null)?.detail
    if (detail) return detail
  }
  return apiErrorMessage(error)
}

function SourceNotice({ view }: { view: MailSettingsView }) {
  if (view.source === 'settings') {
    return (
      <Alert color="brand" icon={<IconInfoCircle size={18} />}>
        Os e-mails saem pelo servidor configurado abaixo.
      </Alert>
    )
  }
  if (view.source === 'env') {
    return (
      <Alert color="gray" icon={<IconInfoCircle size={18} />}>
        Os e-mails saem pelo servidor definido nas variáveis de ambiente da API ({view.env?.host}:
        {view.env?.port}). Ao salvar aqui, esta configuração passa a valer no lugar delas.
      </Alert>
    )
  }
  return (
    <Alert color="yellow" icon={<IconInfoCircle size={18} />}>
      Nenhum servidor SMTP configurado: notificações e redefinições de senha não são enviadas por
      e-mail, só ficam registradas no log da API.
    </Alert>
  )
}

export function MailSettingsPage() {
  const view = useMailSettings()
  if (!view.data) return null
  // A new key after each save or removal starts the form from what is stored.
  const { settings, source } = view.data
  return <MailSettingsForm key={settings?.updatedAt ?? source} view={view.data} />
}

function MailSettingsForm({ view }: { view: MailSettingsView }) {
  const save = useSaveMailSettings()
  const remove = useRemoveMailSettings()
  const test = useTestMail()
  const [form, setForm] = useState<Form>(() => formOf(view))
  const [clearPassword, setClearPassword] = useState(false)
  const [testTo, setTestTo] = useState('')
  const stored = view.settings
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      {
        host: form.host,
        port: form.port,
        secure: form.secure,
        username: form.username || null,
        // Blank keeps the stored password, unless the admin removed it.
        ...(form.password ? { password: form.password } : clearPassword && { password: null }),
        fromAddress: form.fromAddress,
      },
      {
        onSuccess: () => {
          setClearPassword(false)
          toast.success('Configuração de e-mail salva.')
        },
        onError: (error) => toast.error(apiErrorMessage(error)),
      },
    )
  }

  function confirmRemove() {
    confirmDanger({
      title: 'Remover a configuração de e-mail?',
      message: view.env
        ? 'Os e-mails voltam a sair pelo servidor das variáveis de ambiente da API.'
        : 'Sem servidor, os e-mails deixam de ser enviados e só ficam no log da API.',
      confirmLabel: 'Remover',
      onConfirm: () =>
        remove.mutate(undefined, {
          onSuccess: () => toast.success('Configuração removida.'),
          onError: (error) => toast.error(apiErrorMessage(error)),
        }),
    })
  }

  return (
    <Stack gap="md" maw={760}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Text size="sm" c="dimmed">
          Servidor usado para notificações por e-mail, redefinição de senha e testes. A senha fica
          criptografada no banco e nunca é exibida.
        </Text>
        <HelpLink topic="notificacoes-admin" />
      </Group>
      <SourceNotice view={view} />

      <Paper withBorder radius="md" p="lg" component="form" onSubmit={submit}>
        <Stack gap="md">
          <Title order={4}>Servidor SMTP</Title>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <TextInput
              label="Servidor"
              placeholder="smtp.empresa.com.br"
              required
              value={form.host}
              onChange={(event) => set('host', event.currentTarget.value)}
              style={{ gridColumn: 'span 2' }}
            />
            <NumberInput
              label="Porta"
              required
              min={1}
              max={65535}
              allowDecimal={false}
              value={form.port}
              onChange={(value) => {
                const port = Number(value) || 0
                setForm((current) => ({
                  ...current,
                  port,
                  // The usual pairing: 465 is TLS from the start, 587 STARTTLS.
                  secure: port === 465 ? true : port === 587 ? false : current.secure,
                }))
              }}
            />
          </SimpleGrid>
          <Switch
            label="Conexão TLS direta"
            description="Ligado para a porta 465. Desligado, a conexão usa STARTTLS quando o servidor oferece (porta 587)."
            checked={form.secure}
            onChange={(event) => set('secure', event.currentTarget.checked)}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Usuário"
              description="Deixe vazio se o servidor não pede autenticação."
              autoComplete="off"
              value={form.username}
              onChange={(event) => set('username', event.currentTarget.value)}
            />
            <PasswordInput
              label="Senha"
              description={
                stored?.hasPassword && !clearPassword ? (
                  <>
                    Senha salva. Deixe em branco para mantê-la ou{' '}
                    <Anchor
                      component="button"
                      type="button"
                      size="xs"
                      onClick={() => setClearPassword(true)}
                    >
                      remova
                    </Anchor>
                    .
                  </>
                ) : clearPassword ? (
                  'A senha salva será removida ao salvar.'
                ) : (
                  'Para Gmail e Outlook, use uma senha de app.'
                )
              }
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => set('password', event.currentTarget.value)}
            />
          </SimpleGrid>
          <TextInput
            label="Remetente"
            description="Como aparece para quem recebe, ex.: Nexa Flow <no-reply@empresa.com.br>. Muitos servidores exigem o mesmo e-mail do usuário."
            required
            value={form.fromAddress}
            onChange={(event) => set('fromAddress', event.currentTarget.value)}
          />
          <Group justify="space-between">
            {stored ? (
              <Button
                variant="subtle"
                color="red"
                onClick={confirmRemove}
                loading={remove.isPending}
              >
                Remover configuração
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" loading={save.isPending}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder radius="md" p="lg">
        <Stack gap="sm">
          <Title order={4}>Testar envio</Title>
          <Text size="sm" c="dimmed">
            Envia um e-mail agora pelo servidor em uso (salve antes as alterações). Sem
            destinatário, vai para o seu e-mail.
          </Text>
          <Group align="flex-end">
            <TextInput
              label="Destinatário"
              type="email"
              placeholder="seu e-mail"
              value={testTo}
              onChange={(event) => setTestTo(event.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button
              variant="default"
              leftSection={<IconMailForward size={16} />}
              disabled={view.source === 'none'}
              loading={test.isPending}
              onClick={() =>
                test.mutate(testTo.trim() || undefined, {
                  onSuccess: ({ to }) => toast.success(`E-mail de teste enviado para ${to}.`),
                  onError: (error) => toast.error(testErrorMessage(error)),
                })
              }
            >
              Enviar e-mail de teste
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  )
}
