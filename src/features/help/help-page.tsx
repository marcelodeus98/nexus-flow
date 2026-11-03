import {
  Accordion,
  Alert,
  Group,
  NavLink,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { IconBulb, IconSearch } from '@tabler/icons-react'
import { useDeferredValue, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { topicById, topics, type Block, type HelpItem, type HelpTopic } from './content'
import './help-page.css'

// Lowercase without accents, so "historia" finds "história".
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const blockText = (block: Block): string =>
  typeof block === 'string'
    ? block
    : 'list' in block
      ? block.list.join(' ')
      : 'steps' in block
        ? block.steps.join(' ')
        : block.tip

const itemText = (item: HelpItem) => normalize([item.q, ...item.a.map(blockText)].join(' '))

// Training and help: questions and answers by topic, with search across all
// of them. /help/:topicId opens a topic (screens link here with "Como
// funciona?").
export function HelpPage() {
  const { topicId } = useParams()
  const [search, setSearch] = useState('')
  const query = normalize(useDeferredValue(search.trim()))
  const current = topicById(topicId) ?? topics[0]

  const results = query
    ? topics.flatMap((topic) =>
        topic.items
          .filter((item) => itemText(item).includes(query))
          .map((item) => ({ topic, item })),
      )
    : []

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Ajuda e treinamento</Title>
        <Text size="sm" c="dimmed">
          Como usar o Nexa Flow: metodologias, boards, backlog, story points, QA e todo o fluxo do
          trabalho.
        </Text>
      </div>

      <TextInput
        size="md"
        placeholder="Busque uma dúvida (ex.: story points, sprint, bug, WIP)"
        aria-label="Buscar na ajuda"
        leftSection={<IconSearch size={18} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {query ? (
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {results.length === 0
              ? 'Nada encontrado. Tente outras palavras ou navegue pelos temas.'
              : `${results.length} resposta(s) para "${search.trim()}"`}
          </Text>
          {results.length > 0 && (
            <Questions items={results.map((r) => r.item)} topicOf={(i) => results[i].topic} />
          )}
        </Stack>
      ) : (
        <div className="help">
          <Paper
            withBorder
            radius="md"
            p="xs"
            className="help__nav"
            component="nav"
            aria-label="Temas"
          >
            {topics.map((topic) => (
              <NavLink
                key={topic.id}
                component={Link}
                to={`/help/${topic.id}`}
                label={topic.title}
                leftSection={<topic.icon size={18} stroke={1.8} />}
                active={topic.id === current.id}
              />
            ))}
          </Paper>
          <Stack gap="md" className="help__content">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <current.icon size={28} stroke={1.6} color="var(--nexa-teal-700)" />
              <div>
                <Title order={3}>{current.title}</Title>
                <Text size="sm" c="dimmed">
                  {current.description}
                </Text>
              </div>
            </Group>
            <Questions items={current.items} defaultOpen={current.items[0]?.q} />
          </Stack>
        </div>
      )}
    </Stack>
  )
}

function Questions({
  items,
  topicOf,
  defaultOpen,
}: {
  items: HelpItem[]
  topicOf?: (index: number) => HelpTopic
  defaultOpen?: string
}) {
  return (
    <Accordion
      variant="separated"
      radius="md"
      multiple
      defaultValue={defaultOpen ? [defaultOpen] : []}
      key={items.map((item) => item.q).join('|')}
    >
      {items.map((item, index) => (
        <Accordion.Item key={item.q} value={item.q} className="help__item">
          <Accordion.Control>
            <Text fw={600}>{item.q}</Text>
            {topicOf && (
              <Text size="xs" c="dimmed">
                {topicOf(index).title}
              </Text>
            )}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm" className="help__answer">
              {item.a.map((block, i) => (
                <Answer key={i} block={block} />
              ))}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}

function Answer({ block }: { block: Block }) {
  if (typeof block === 'string') return <Text size="sm">{block}</Text>
  if ('list' in block)
    return (
      <ul>
        {block.list.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    )
  if ('steps' in block)
    return (
      <ol>
        {block.steps.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    )
  return (
    <Alert variant="light" color="brand" icon={<IconBulb size={18} />} p="xs">
      <Text size="sm">{block.tip}</Text>
    </Alert>
  )
}
