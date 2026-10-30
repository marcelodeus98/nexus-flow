import '../rich-text.css'
import { Fragment, type ReactNode } from 'react'

type Node = {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  content?: Node[]
}

// Renders a stored Tiptap document as plain React, without an editor per
// comment. Unknown node types fall back to their children, so newer content
// degrades instead of disappearing.
export function RichTextView({ doc }: { doc: unknown }) {
  return <div className="rich-text">{render(doc as Node, 'r')}</div>
}

function render(node: Node, key: string): ReactNode {
  const children = node.content?.map((child, i) => render(child, `${key}.${i}`))
  switch (node.type) {
    case 'doc':
      return <>{children}</>
    case 'paragraph':
      return <p key={key}>{children}</p>
    case 'heading':
      return (
        <p key={key} className="rich-text__heading">
          {children}
        </p>
      )
    case 'bulletList':
      return <ul key={key}>{children}</ul>
    case 'orderedList':
      return <ol key={key}>{children}</ol>
    case 'listItem':
      return <li key={key}>{children}</li>
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>
    case 'codeBlock':
      return (
        <pre key={key}>
          <code>{children}</code>
        </pre>
      )
    case 'hardBreak':
      return <br key={key} />
    case 'mention':
      return (
        <span key={key} className="rich-text__mention">
          @{String(node.attrs?.label ?? node.attrs?.id ?? '')}
        </span>
      )
    case 'text': {
      const marked = (node.marks ?? []).reduce<ReactNode>((content, mark) => {
        switch (mark.type) {
          case 'bold':
            return <strong>{content}</strong>
          case 'italic':
            return <em>{content}</em>
          case 'strike':
            return <s>{content}</s>
          case 'code':
            return <code>{content}</code>
          default:
            return content
        }
      }, node.text)
      return <Fragment key={key}>{marked}</Fragment>
    }
    default:
      return children ? <span key={key}>{children}</span> : null
  }
}
