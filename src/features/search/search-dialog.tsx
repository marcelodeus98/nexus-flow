import { useQuery } from '@tanstack/react-query'
import { SearchIcon } from 'lucide-react'
import { useDeferredValue, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { http } from '@/shared/api/http'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'

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
        variant="outline"
        size="sm"
        className="hidden w-56 justify-start text-muted-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <SearchIcon /> Buscar cards
        <kbd className="ml-auto rounded border px-1 text-[10px]">Ctrl K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        aria-label="Buscar cards"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-24 translate-y-0 gap-0 p-0 sm:max-w-lg"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Buscar cards</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            <SearchIcon className="size-4 text-muted-foreground" aria-hidden />
            <Input
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
              className="h-11 border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <ul id="search-results" role="listbox" className="max-h-80 overflow-y-auto p-1">
            {query.length >= 2 && results.isSuccess && hits.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhum card encontrado.
              </li>
            )}
            {query.length < 2 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Digite ao menos 2 caracteres.
              </li>
            )}
            {hits.map((hit, index) => (
              <li
                key={hit.id}
                role="option"
                aria-selected={index === selected}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm ${
                  index === selected ? 'bg-accent' : ''
                }`}
                onMouseEnter={() => setSelected(index)}
                onClick={() => go(hit)}
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {hit.projectKey}-{hit.number}
                </span>{' '}
                {hit.title}
                <span className="block text-xs text-muted-foreground">
                  {hit.projectName} · {hit.columnName}
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
