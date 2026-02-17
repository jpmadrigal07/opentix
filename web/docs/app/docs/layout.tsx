import Link from 'next/link'
import { Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { DocsSearch } from '@/components/docs-search'
import { DocsSidebar } from '@/components/docs-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { docs } from '@/.velite'

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

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DocsSidebar docs={docs} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <span>/</span>
              <Link href="/docs" className="font-medium text-foreground hover:text-foreground">
                Docs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <DocsSearch docs={docs} />
              <Button variant="outline" size="icon" className="size-9" asChild aria-label="Install on VS Code">
                <a href={VSCODE_MARKETPLACE_URL} target="_blank" rel="noopener noreferrer">
                  <VSCodeIcon className="size-4" />
                </a>
              </Button>
              <Button variant="outline" size="icon" className="size-9" asChild aria-label="GitHub">
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="size-4" />
                </a>
              </Button>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
