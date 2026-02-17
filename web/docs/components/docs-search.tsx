'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Fuse from 'fuse.js'
import { Search } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { Doc } from '@/.velite'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface DocsSearchProps {
  docs: Doc[]
}

const fuseOptions = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'description', weight: 0.3 },
    { name: 'searchText', weight: 0.3 },
  ],
  threshold: 0.4,
  minMatchCharLength: 2,
  ignoreLocation: true,
  includeScore: true,
}

export function DocsSearch({ docs }: DocsSearchProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const fuse = React.useMemo(
    () => new Fuse(docs, fuseOptions),
    [docs]
  )

  const results = React.useMemo(() => {
    if (!query.trim()) return docs.slice(0, 8)
    return fuse.search(query).map((r) => r.item)
  }, [docs, fuse, query])

  const selectedDoc = results[selectedIndex]

  const openSearch = React.useCallback(() => {
    setOpen(true)
    setQuery('')
    setSelectedIndex(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const closeSearch = React.useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openSearch])

  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSearch()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i < results.length - 1 ? i + 1 : 0))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i > 0 ? i - 1 : results.length - 1))
        return
      }
      if (e.key === 'Enter' && selectedDoc) {
        e.preventDefault()
        router.push(selectedDoc.permalink)
        closeSearch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, results, selectedDoc, router, closeSearch])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  React.useEffect(() => {
    if (!listRef.current || selectedIndex < 0) return
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, results])

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        className="inline-flex h-9 min-w-[280px] max-w-[420px] flex-1 items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-w-[320px]"
        aria-label="Search docs"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search docs...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
          <DialogPrimitive.Content
            className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-1/2 top-[20%] z-50 w-full max-w-2xl -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-popover p-0 shadow-lg"
            onCloseAutoFocus={(e) => e.preventDefault()}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DialogPrimitive.Title className="sr-only">
              Search documentation
            </DialogPrimitive.Title>
            <div className="flex min-w-0 flex-col gap-2 p-2">
              <div className="flex min-w-0 items-center gap-2 border-b border-border px-2 pb-2">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="search"
                  placeholder="Search documentation..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-w-0 flex-1"
                  autoComplete="off"
                  aria-label="Search"
                />
              </div>
              <ScrollArea className="h-[min(60vh,400px)] min-w-0 overflow-hidden">
                <div ref={listRef} className="flex min-w-0 flex-col gap-0.5 py-1" role="listbox" aria-label="Search results">
                  {results.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No results found.
                    </p>
                  ) : (
                    results.map((doc, i) => (
                      <Link
                        key={doc.slug}
                        href={doc.permalink}
                        data-index={i}
                        role="option"
                        aria-selected={i === selectedIndex}
                        onClick={closeSearch}
                        className={cn(
                          'flex min-w-0 flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors',
                          i === selectedIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent/50'
                        )}
                      >
                        <span className="min-w-0 truncate font-medium">{doc.title}</span>
                        {doc.description && (
                          <span className="min-w-0 truncate text-xs text-muted-foreground">
                            {doc.description}
                          </span>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
