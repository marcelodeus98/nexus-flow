import Mention from '@tiptap/extension-mention'
import { EditorContent, ReactRenderer, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { SuggestionOptions } from '@tiptap/suggestion'
import { useEffect, useRef } from 'react'
import { Button, Group, Stack, Text } from '@mantine/core'
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
        HTMLAttributes: { class: 'rich-text__mention' },
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
        class: 'rich-text',
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

  // useEditor does not re-render on each keystroke; this does, so the
  // placeholder goes away as soon as something is typed.
  const empty = useEditorState({
    editor,
    selector: ({ editor: current }) => current?.isEmpty ?? true,
  })

  function submit() {
    if (!editor || editor.isEmpty) return
    onSubmit(editor.getJSON() as Doc)
    if (!initial) editor.commands.clearContent()
  }

  return (
    <Stack gap="xs">
      <div ref={wrapper} className="rich-text-box">
        <EditorContent editor={editor} />
        {empty && !initial && (
          <p className="rich-text-box__placeholder">
            Escreva um comentário. Use @ para mencionar alguém.
          </p>
        )}
      </div>
      <Group gap="xs">
        <Button size="xs" loading={pending} onClick={submit}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button size="xs" variant="subtle" color="gray" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Text size="xs" c="dimmed">
          Ctrl+Enter envia
        </Text>
      </Group>
    </Stack>
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
