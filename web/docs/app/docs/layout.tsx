import Link from 'next/link'
import { Box, Github, HandHeart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DocsSearch } from '@/components/docs-search'
import { DocsSidebar } from '@/components/docs-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { docs } from '@/.velite'

const GITHUB_URL = 'https://github.com/jpmadrigal07/opentix'
const VSCODE_MARKETPLACE_URL = 'https://marketplace.visualstudio.com/items?itemName=jpmadrigal07.opentix'
const VSX_REGISTRY_URL = 'https://open-vsx.org/extension/jpmadrigal07/opentix'
const SPONSOR_URL = 'https://www.buymeacoffee.com/jpmadrigal07'
const DISCORD_URL = 'https://discord.gg/YnfyFzqr'

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

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
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
            <TooltipProvider>
              <div className="hidden md:flex items-center gap-2">
                <DocsSearch docs={docs} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="size-9" asChild aria-label="GitHub">
                      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                        <Github className="size-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>GitHub</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="size-9" asChild aria-label="VS Code Marketplace">
                      <a href={VSCODE_MARKETPLACE_URL} target="_blank" rel="noopener noreferrer">
                        <VSCodeIcon className="size-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>VS Code Marketplace</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="size-9" asChild aria-label="Open VSX Registry">
                      <a href={VSX_REGISTRY_URL} target="_blank" rel="noopener noreferrer">
                        <Box className="size-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open VSX Registry</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="size-9" asChild aria-label="Sponsor">
                      <a href={SPONSOR_URL} target="_blank" rel="noopener noreferrer">
                        <HandHeart className="size-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sponsor</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="size-9" asChild aria-label="Discord">
                      <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
                        <DiscordIcon className="size-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Discord</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
