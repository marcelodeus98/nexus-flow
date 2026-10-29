import Mention from '@tiptap/extension-mention'
import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { SuggestionOptions } from '@tiptap/suggestion'
import { useEffect, useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { MentionList, type MentionItem, type MentionListHandle } from './mention-list'

type Doc = Record<string, unknown>

// Comment box with @mentions of project members. The suggestion menu lives
// inside the editor's wrapper: the card drawer is a modal, and anything
// rendered outside it would not receive clicks.
export function CommentEditor({
  members,
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  members: MentionItem[]
  initial?: Doc
  submitLabel: string
  pending: boolean
  onSubmit: (doc: Doc) => void
  onCancel?: () => void
}) {
  const wrapper = useRef<HTMLDivElement>(null)
  // The suggestion reads members when the user types, not when the editor
  // was created.
  const membersRef = useRef(members)
  useEffect(() => {
    membersRef.current = members
  }, [members])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: { class: 'rounded bg-primary/10 px-1 font-medium text-primary' },
        // The getters run when the user types "@", never during render.
        suggestion: mentionSuggestion(
          // oxlint-disable-next-line react/refs
          () => membersRef.current,
          // oxlint-disable-next-line react/refs
          () => wrapper.current,
        ),
      }),
    ],
    content: initial ?? '',
    editorProps: {
      attributes: {
        class:
          'min-h-16 px-3 py-2 text-sm outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1',
        'aria-label': 'Comentário',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          submit()
          return true
        }
        return false
      },
    },
  })

  function submit() {
    if (!editor || editor.isEmpty) return
    onSubmit(editor.getJSON() as Doc)
    if (!initial) editor.commands.clearContent()
  }

  return (
    <div className="space-y-2">
      <div
        ref={wrapper}
        className="relative rounded-lg border focus-within:ring-2 focus-within:ring-ring/50"
      >
        <EditorContent editor={editor} />
        {editor?.isEmpty && !initial && (
          <p className="pointer-events-none absolute top-2 left-3 text-sm text-muted-foreground">
            Escreva um comentário. Use @ para mencionar alguém.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={pending} onClick={submit}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <span className="text-xs text-muted-foreground">Ctrl+Enter envia</span>
      </div>
    </div>
  )
}

// The "@" menu. Getters, not values: members and the wrapper element are read
// when the user types, after the editor was created.
function mentionSuggestion(
  getMembers: () => MentionItem[],
  getWrapper: () => HTMLElement | null,
): Omit<SuggestionOptions<MentionItem>, 'editor'> {
  return {
    items: ({ query }) =>
      getMembers()
        .filter((member) => member.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8),
    render: () => {
      let component: ReactRenderer<MentionListHandle> | undefined
      const place = (rect: DOMRect | null | undefined) => {
        const box = getWrapper()?.getBoundingClientRect()
        const element = component?.element as HTMLElement | undefined
        if (!rect || !box || !element) return
        element.style.position = 'absolute'
        element.style.zIndex = '10'
        element.style.left = `${rect.left - box.left}px`
        element.style.top = `${rect.bottom - box.top + 4}px`
      }
      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, { props, editor: props.editor })
          getWrapper()?.appendChild(component.element)
          place(props.clientRect?.())
        },
        onUpdate: (props) => {
          component?.updateProps(props)
          place(props.clientRect?.())
        },
        onKeyDown: ({ event }) => {
          if (event.key === 'Escape') {
            component?.element.remove()
            return true
          }
          return component?.ref?.onKeyDown(event) ?? false
        },
        onExit: () => {
          component?.element.remove()
          component?.destroy()
        },
      }
    },
  }
}
