import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { BoldIcon, ItalicIcon, ListIcon, ListOrderedIcon, CodeIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'

type Doc = Record<string, unknown>

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
          class:
            'prose-sm min-h-24 max-w-none rounded-lg px-3 py-2 outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_p]:my-1',
          'aria-label': 'Descrição do card',
        },
      },
    },
    [editing],
  )

  if (!editor) return null
  const empty = editor.isEmpty

  if (!editing) {
    return (
      <div
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        onClick={() => editable && setEditing(true)}
        onKeyDown={(e) => editable && e.key === 'Enter' && setEditing(true)}
        className={`rounded-lg border border-transparent ${editable ? 'cursor-text hover:border-border' : ''}`}
      >
        {empty ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            {editable ? 'Adicionar uma descrição…' : 'Sem descrição.'}
          </p>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    )
  }

  const toolbar = [
    {
      icon: BoldIcon,
      label: 'Negrito',
      run: () => editor.chain().focus().toggleBold().run(),
      active: 'bold',
    },
    {
      icon: ItalicIcon,
      label: 'Itálico',
      run: () => editor.chain().focus().toggleItalic().run(),
      active: 'italic',
    },
    {
      icon: ListIcon,
      label: 'Lista',
      run: () => editor.chain().focus().toggleBulletList().run(),
      active: 'bulletList',
    },
    {
      icon: ListOrderedIcon,
      label: 'Lista numerada',
      run: () => editor.chain().focus().toggleOrderedList().run(),
      active: 'orderedList',
    },
    {
      icon: CodeIcon,
      label: 'Código',
      run: () => editor.chain().focus().toggleCode().run(),
      active: 'code',
    },
  ]

  return (
    <div className="space-y-2">
      <div className="rounded-lg border focus-within:ring-2 focus-within:ring-ring/50">
        <div className="flex gap-0.5 border-b p-1">
          {toolbar.map(({ icon: Icon, label, run, active }) => (
            <Button
              key={label}
              type="button"
              variant={editor.isActive(active) ? 'secondary' : 'ghost'}
              size="icon-xs"
              aria-label={label}
              onClick={run}
            >
              <Icon />
            </Button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={saving}
          onClick={() => {
            onSave(editor.isEmpty ? null : (editor.getJSON() as Doc))
            setEditing(false)
          }}
        >
          Salvar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            editor.commands.setContent(value ?? '')
            setEditing(false)
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
