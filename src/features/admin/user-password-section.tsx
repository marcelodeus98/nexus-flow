import { Button, CopyButton, Group, PasswordInput, Stack, Text } from '@mantine/core'
import { IconCheck, IconCopy, IconMail, IconRefresh } from '@tabler/icons-react'
import { useState } from 'react'
import { apiErrorMessage } from '@/shared/api/errors'
import { toast } from '@/shared/notify/toast'
import { useSetUserPassword, type User } from './api'
import { generatePassword } from './generate-password'

const MIN_LENGTH = 8

// Inside the user dialog, for admins editing someone else: type or generate a
// new password, copy it, and save it with or without e-mailing it.
export function UserPasswordSection({ user }: { user: User }) {
  const setPassword = useSetUserPassword()
  const [password, setPasswordValue] = useState('')
  const [visible, setVisible] = useState(false)
  // Which button is saving, for its spinner.
  const [sending, setSending] = useState<boolean | null>(null)
  const valid = password.length >= MIN_LENGTH

  function generate() {
    setPasswordValue(generatePassword())
    setVisible(true)
  }

  function save(notify: boolean) {
    setSending(notify)
    setPassword.mutate(
      { id: user.id, password, notify },
      {
        onSuccess: () =>
          toast.success(
            notify
              ? `Senha alterada e enviada para ${user.email}.`
              : 'Senha alterada. Copie e repasse para a pessoa.',
          ),
        onError: (error) => toast.error(apiErrorMessage(error)),
        onSettled: () => setSending(null),
      },
    )
  }

  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        A pessoa sai de todas as sessões abertas e passa a entrar com a nova senha.
      </Text>
      <Group align="flex-end" gap="xs" wrap="nowrap">
        <PasswordInput
          label="Nova senha"
          description={`Mínimo de ${MIN_LENGTH} caracteres.`}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPasswordValue(e.target.value)}
          visible={visible}
          onVisibilityChange={setVisible}
          maxLength={128}
          style={{ flex: 1 }}
        />
        <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={generate}>
          Gerar
        </Button>
      </Group>
      <Group justify="flex-end" gap="xs">
        <CopyButton value={password}>
          {({ copied, copy }) => (
            <Button
              variant="subtle"
              color={copied ? 'teal' : undefined}
              leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              onClick={copy}
              disabled={!password}
            >
              {copied ? 'Copiada' : 'Copiar senha'}
            </Button>
          )}
        </CopyButton>
        <Button
          variant="light"
          onClick={() => save(false)}
          disabled={!valid || setPassword.isPending}
          loading={sending === false}
        >
          Salvar senha
        </Button>
        <Button
          leftSection={<IconMail size={16} />}
          onClick={() => save(true)}
          disabled={!valid || setPassword.isPending}
          loading={sending === true}
        >
          Salvar e enviar por e-mail
        </Button>
      </Group>
    </Stack>
  )
}
