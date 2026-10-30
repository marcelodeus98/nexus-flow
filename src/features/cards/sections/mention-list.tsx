import { useImperativeHandle, useState, type Ref } from 'react'

export type MentionItem = { id: string; label: string }

export type MentionListHandle = { onKeyDown: (event: KeyboardEvent) => boolean }

// The suggestion menu shown while typing "@nome" in a comment.
export function MentionList({
  items,
  command,
  ref,
}: {
  items: MentionItem[]
  command: (item: MentionItem) => void
  ref?: Ref<MentionListHandle>
}) {
  const [selected, setSelected] = useState(0)
  const [lastItems, setLastItems] = useState(items)
  // A new query resets the highlight to the first match.
  if (items !== lastItems) {
    setLastItems(items)
    setSelected(0)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (event.key === 'ArrowDown') {
        setSelected((selected + 1) % Math.max(items.length, 1))
        return true
      }
      if (event.key === 'ArrowUp') {
        setSelected((selected - 1 + items.length) % Math.max(items.length, 1))
        return true
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = items[selected]
        if (item) command(item)
        return true
      }
      return false
    },
  }))

  return (
    <ul role="listbox" aria-label="Mencionar pessoa" className="mention-list">
      {items.length === 0 && <li className="mention-list__empty">Ninguém encontrado</li>}
      {items.map((item, index) => (
        <li
          key={item.id}
          role="option"
          aria-selected={index === selected}
          className="mention-list__item"
          onMouseDown={(event) => {
            event.preventDefault()
            command(item)
          }}
        >
          {item.label}
        </li>
      ))}
    </ul>
  )
}
