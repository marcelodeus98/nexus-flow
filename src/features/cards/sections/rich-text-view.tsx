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
  return <div className="space-y-1 text-sm break-words">{render(doc as Node, 'r')}</div>
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
        <p key={key} className="font-semibold">
          {children}
        </p>
      )
    case 'bulletList':
      return (
        <ul key={key} className="list-disc pl-5">
          {children}
        </ul>
      )
    case 'orderedList':
      return (
        <ol key={key} className="list-decimal pl-5">
          {children}
        </ol>
      )
    case 'listItem':
      return <li key={key}>{children}</li>
    case 'blockquote':
      return (
        <blockquote key={key} className="border-l-2 pl-3 text-muted-foreground">
          {children}
        </blockquote>
      )
    case 'codeBlock':
      return (
        <pre key={key} className="overflow-x-auto rounded bg-muted p-2 text-xs">
          <code>{children}</code>
        </pre>
      )
    case 'hardBreak':
      return <br key={key} />
    case 'mention':
      return (
        <span key={key} className="rounded bg-primary/10 px-1 font-medium text-primary">
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
            return <code className="rounded bg-muted px-1">{content}</code>
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
