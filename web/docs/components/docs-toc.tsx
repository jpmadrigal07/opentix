'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface TocEntry {
  title: string
  url: string
  items?: TocEntry[]
}

interface DocsTocProps {
  toc: Array<{ title: string; url: string; items?: { title: string; url: string }[] }>
  className?: string
}

export function DocsToc({ toc, className }: DocsTocProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (toc.length === 0) return

    const ids = toc.flatMap((e) => [e.url.slice(1), ...(e.items ?? []).map((i) => i.url.slice(1))])

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-80px 0% -80% 0%', threshold: 0 }
    )

    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [toc])

  if (toc.length === 0) return null

  return (
    <aside
      className={cn(
        'fixed right-6 top-14 z-10 hidden w-56 bg-background xl:block',
        className
      )}
    >
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
          <nav className="space-y-2 pt-6">
            <p className="mb-4 text-sm font-medium text-foreground">On this page</p>
            <ul className="space-y-2 border-l border-border pl-4">
              {toc.map((entry) => (
                <li key={entry.url}>
                  <a
                    href={entry.url}
                    onClick={(e) => {
                      const id = entry.url.slice(1)
                      const el = document.getElementById(id)
                      if (el) {
                        e.preventDefault()
                        setActiveId(id)
                        const headerHeight = 56 // h-14 = 3.5rem = 56px
                        const elementPosition = el.getBoundingClientRect().top + window.pageYOffset
                        const offsetPosition = elementPosition - headerHeight - 8 // 8px extra padding
                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        })
                      }
                    }}
                    className={cn(
                      'block text-sm leading-6 transition-colors hover:text-foreground',
                      activeId === entry.url.slice(1)
                        ? 'font-medium text-foreground border-l-2 border-primary -ml-[17px] pl-4'
                        : 'text-muted-foreground'
                    )}
                  >
                    {entry.title}
                  </a>
                  {entry.items && entry.items.length > 0 && (
                    <ul className="mt-2 space-y-2 border-l border-border pl-4">
                      {entry.items.map((sub) => (
                        <li key={sub.url}>
                          <a
                            href={sub.url}
                            onClick={(e) => {
                              const id = sub.url.slice(1)
                              const el = document.getElementById(id)
                              if (el) {
                                e.preventDefault()
                                setActiveId(id)
                                const headerHeight = 56 // h-14 = 3.5rem = 56px
                                const elementPosition = el.getBoundingClientRect().top + window.pageYOffset
                                const offsetPosition = elementPosition - headerHeight - 8 // 8px extra padding
                                window.scrollTo({
                                  top: offsetPosition,
                                  behavior: 'smooth'
                                })
                              }
                            }}
                            className={cn(
                              'block text-sm leading-6 transition-colors hover:text-foreground',
                              activeId === sub.url.slice(1)
                                ? 'font-medium text-foreground'
                                : 'text-muted-foreground'
                            )}
                          >
                            {sub.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </ScrollArea>
    </aside>
  )
}
