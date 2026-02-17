'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Github } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DocsSearch } from '@/components/docs-search'
import { Separator } from '@/components/ui/separator'
import type { Doc } from '@/.velite'

const GITHUB_URL = 'https://github.com/jpmadrigal07/opentix'
const VSCODE_MARKETPLACE_URL = 'https://marketplace.visualstudio.com/items?itemName=opentix.opentix'

function VSCodeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
    </svg>
  )
}

const SECTION_ORDER = [
  'Getting Started',
  'Core Concepts',
  'Features',
  'Reference',
  'Contributing',
]

interface DocsSidebarProps {
  docs: Doc[]
}

function groupDocsBySection(docs: Doc[]) {
  const groups = new Map<string, Doc[]>()

  for (const doc of docs) {
    const section = doc.section ?? 'General'
    if (!groups.has(section)) {
      groups.set(section, [])
    }
    groups.get(section)!.push(doc)
  }

  // Sort docs within each group by order
  for (const [, groupDocs] of groups) {
    groupDocs.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  }

  // Sort sections by defined order, unknown sections go last
  const sorted = [...groups.entries()].sort(([a], [b]) => {
    const aIdx = SECTION_ORDER.indexOf(a)
    const bIdx = SECTION_ORDER.indexOf(b)
    const aOrder = aIdx === -1 ? SECTION_ORDER.length : aIdx
    const bOrder = bIdx === -1 ? SECTION_ORDER.length : bIdx
    return aOrder - bOrder
  })

  return sorted
}

export function DocsSidebar({ docs }: DocsSidebarProps) {
  const pathname = usePathname()
  const sections = groupDocsBySection(docs)

  return (
    <Sidebar>
      <SidebarHeader className="flex h-14 shrink-0 items-center border-b border-sidebar-border">
        <Link
          href="/docs"
          className="flex h-full w-full items-center gap-2 px-4 font-semibold text-foreground hover:text-foreground"
        >
          <Image
            src="/opentix-icon.svg"
            alt=""
            width={28}
            height={28}
            className="size-7 shrink-0"
          />
          <span>Opentix Docs</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-3.5rem-8rem)] md:h-[calc(100vh-3.5rem)]">
          {sections.map(([section, sectionDocs]) => (
            <SidebarGroup key={section}>
              <SidebarGroupLabel>{section}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sectionDocs.map((doc) => {
                    const isActive = pathname === doc.permalink
                    return (
                      <SidebarMenuItem key={doc.slug}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={doc.permalink}>{doc.title}</Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="md:hidden border-t border-sidebar-border p-4">
        <div className="flex flex-col gap-3">
          <div className="w-full">
            <div className="[&>button]:min-w-0 [&>button]:max-w-full [&>button]:w-full">
              <DocsSearch docs={docs} />
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex-1" asChild aria-label="Install on VS Code">
              <a href={VSCODE_MARKETPLACE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                <VSCodeIcon className="size-4" />
                <span>VS Code</span>
              </a>
            </Button>
            <Button variant="outline" className="flex-1" asChild aria-label="GitHub">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                <Github className="size-4" />
                <span>GitHub</span>
              </a>
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
