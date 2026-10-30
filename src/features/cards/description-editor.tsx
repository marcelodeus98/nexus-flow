import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ActionIcon, Button, Group, Stack, Text } from '@mantine/core'
import { IconBold, IconCode, IconItalic, IconList, IconListNumbers } from '@tabler/icons-react'
import { useState } from 'react'
import './rich-text.css'

type Doc = Record<string, unknown>

const FORMATS = ['bold', 'italic', 'bulletList', 'orderedList', 'code'] as const

// Rich description stored as a Tiptap document. Read-only until the user
// clicks it; saving sends the whole document. Mentions arrive with comments.
export function DescriptionEditor({
  value,
  editable,
  saving,
  onSave,
}: {
  value: Doc | null
  editable: boolean
  saving: boolean
  onSave: (doc: Doc | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: value ?? '',
      editable: editing,
      editorProps: {
        attributes: {
          class: 'rich-text',
          'aria-label': 'Descrição do card',
        },
      },
    },
    [editing],
  )

  // useEditor does not re-render on each keystroke: what the UI shows about
  // the document (empty? which formats are on?) comes from useEditorState.
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      empty: current?.isEmpty ?? true,
      active: Object.fromEntries(
        FORMATS.map((format) => [format, current?.isActive(format) ?? false]),
      ) as Record<(typeof FORMATS)[number], boolean>,
    }),
  })

  if (!editor || !state) return null
  const empty = state.empty

  if (!editing) {
    return (
      <div
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        onClick={() => editable && setEditing(true)}
        onKeyDown={(e) => editable && e.key === 'Enter' && setEditing(true)}
        className={`rich-text-view${editable ? ' rich-text-view--editable' : ''}`}
      >
        {empty ? (
          <Text size="sm" c="dimmed" px="sm" py="xs">
            {editable ? 'Adicionar uma descrição…' : 'Sem descrição.'}
          </Text>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    )
  }

  const toolbar = [
    {
      icon: IconBold,
      label: 'Negrito',
      run: () => editor.chain().focus().toggleBold().run(),
      active: 'bold' as const,
    },
    {
      icon: IconItalic,
      label: 'Itálico',
      run: () => editor.chain().focus().toggleItalic().run(),
      active: 'italic' as const,
    },
    {
      icon: IconList,
      label: 'Lista',
      run: () => editor.chain().focus().toggleBulletList().run(),
      active: 'bulletList' as const,
    },
    {
      icon: IconListNumbers,
      label: 'Lista numerada',
      run: () => editor.chain().focus().toggleOrderedList().run(),
      active: 'orderedList' as const,
    },
    {
      icon: IconCode,
      label: 'Código',
      run: () => editor.chain().focus().toggleCode().run(),
      active: 'code' as const,
    },
  ]

  return (
    <Stack gap="xs">
      <div className="rich-text-box">
        <div className="rich-text-box__toolbar">
          {toolbar.map(({ icon: Icon, label, run, active }) => (
            <ActionIcon
              key={label}
              variant={state.active[active] ? 'light' : 'subtle'}
              color={state.active[active] ? undefined : 'gray'}
              size="sm"
              aria-label={label}
              onClick={run}
            >
              <Icon size={14} />
            </ActionIcon>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
      <Group gap="xs">
        <Button
          size="xs"
          loading={saving}
          onClick={() => {
            onSave(editor.isEmpty ? null : (editor.getJSON() as Doc))
            setEditing(false)
          }}
        >
          Salvar
        </Button>
        <Button
          size="xs"
          variant="subtle"
          color="gray"
          onClick={() => {
            editor.commands.setContent(value ?? '')
            setEditing(false)
          }}
        >
          Cancelar
        </Button>
      </Group>
    </Stack>
  )
}
