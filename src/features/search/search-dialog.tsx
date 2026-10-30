import { useQuery } from '@tanstack/react-query'
import {
  ActionIcon,
  Box,
  Button,
  Kbd,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { useDeferredValue, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { http } from '@/shared/api/http'

type Hit = {
  id: string
  number: number
  title: string
  projectKey: string
  projectName: string
  columnName: string
}

// Finds cards in every project the user can see, by title or by key
// ("NEXA-12"). Opens with Ctrl+K / ⌘K.
export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [selected, setSelected] = useState(0)
  const query = useDeferredValue(text.trim())
  const navigate = useNavigate()
  const results = useQuery({
    queryKey: ['search', query],
    queryFn: () => http<Hit[]>(`/search/cards?q=${encodeURIComponent(query)}`),
    enabled: open && query.length >= 2,
    staleTime: 10_000,
  })
  const hits = query.length >= 2 ? (results.data ?? []) : []

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function go(hit: Hit) {
    setOpen(false)
    setText('')
    void navigate(`/p/${hit.projectKey}/c/${hit.number}`)
  }

  return (
    <>
      <Button
        variant="default"
        size="xs"
        w={220}
        visibleFrom="md"
        justify="space-between"
        leftSection={<IconSearch size={14} />}
        rightSection={<Kbd size="xs">Ctrl K</Kbd>}
        c="dimmed"
        fw={400}
        onClick={() => setOpen(true)}
      >
        Buscar cards
      </Button>
      <ActionIcon
        variant="subtle"
        c="gray.6"
        hiddenFrom="md"
        aria-label="Buscar cards"
        onClick={() => setOpen(true)}
      >
        <IconSearch size={18} stroke={1.6} />
      </ActionIcon>
      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        withCloseButton={false}
        padding={0}
        size="lg"
        yOffset="6rem"
        title={<span className="visually-hidden">Buscar cards</span>}
        styles={{ header: { display: 'none' } }}
      >
        <TextInput
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setSelected(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSelected((i) => Math.min(i + 1, hits.length - 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSelected((i) => Math.max(i - 1, 0))
            }
            if (e.key === 'Enter' && hits[selected]) go(hits[selected])
          }}
          placeholder="Título do card ou chave (NEXA-12)"
          aria-label="Buscar cards"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls="search-results"
          leftSection={<IconSearch size={16} />}
          variant="unstyled"
          size="md"
          px="sm"
          style={{ borderBottom: '1px solid var(--nexa-border)' }}
        />
        <ScrollArea.Autosize mah={320}>
          <Stack id="search-results" role="listbox" gap={2} p={4}>
            {query.length >= 2 && results.isSuccess && hits.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="lg">
                Nenhum card encontrado.
              </Text>
            )}
            {query.length < 2 && (
              <Text size="sm" c="dimmed" ta="center" py="lg">
                Digite ao menos 2 caracteres.
              </Text>
            )}
            {hits.map((hit, index) => (
              <Box
                key={hit.id}
                role="option"
                aria-selected={index === selected}
                px="sm"
                py={6}
                style={{
                  cursor: 'pointer',
                  borderRadius: 'var(--mantine-radius-sm)',
                  background: index === selected ? 'var(--nexa-teal-50)' : undefined,
                }}
                onMouseEnter={() => setSelected(index)}
                onClick={() => go(hit)}
              >
                <Text size="sm">
                  <Text span ff="monospace" size="xs" c="dimmed">
                    {hit.projectKey}-{hit.number}
                  </Text>{' '}
                  {hit.title}
                </Text>
                <Text size="xs" c="dimmed">
                  {hit.projectName} · {hit.columnName}
                </Text>
              </Box>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </Modal>
    </>
  )
}
