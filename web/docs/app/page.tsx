import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { HandHeart, Megaphone } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { getUrl } from '@/lib/metadata'

const GITHUB_URL = 'https://github.com/jpmadrigal07/opentix'
const GITHUB_ISSUES_URL = 'https://github.com/jpmadrigal07/opentix/issues'
const VSCODE_MARKETPLACE_URL =
  'https://marketplace.visualstudio.com/items?itemName=jpmadrigal07.opentix'
const VSX_REGISTRY_URL =
  'https://open-vsx.org/extension/jpmadrigal07/opentix'
const BUYMEACOFFEE_URL = 'https://www.buymeacoffee.com/jpmadrigal07'
const DISCORD_WIDGET_URL = 'https://discord.gg/YnfyFzqr'

export const metadata: Metadata = {
  title: 'Opentix - Git-native ticket management for modern IDEs',
  description:
    'Manage tickets as Markdown files in your repository. Kanban board, sprint management, AI context, and auto-sync — all inside the IDE.',
  alternates: {
    canonical: getUrl('/'),
  },
  openGraph: {
    title: 'Opentix - Git-native ticket management for modern IDEs',
    description:
      'Manage tickets as Markdown files in your repository. Kanban board, sprint management, AI context, and auto-sync — all inside the IDE.',
    url: getUrl('/'),
  },
}

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background font-sans">
      <div className="absolute inset-x-4 top-4 flex flex-nowrap items-center justify-end gap-2 overflow-hidden sm:inset-x-6">
        <a
          href={BUYMEACOFFEE_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Sponsor"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/15 sm:px-3"
        >
          <HandHeart className="h-5 w-5 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Sponsor</span>
        </a>
        <a
          href={GITHUB_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Report an issue"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-muted/50 px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-3"
        >
          <Megaphone className="h-5 w-5 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Report an issue</span>
        </a>
        <a
          href={DISCORD_WIDGET_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Community"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-[#5865F2]/40 bg-[#5865F2]/10 px-2 text-sm font-medium text-[#5865F2] transition-colors hover:bg-[#5865F2]/20 dark:text-[#808aff] dark:hover:bg-[#5865F2]/15 sm:px-3"
        >
          <svg
            className="h-5 w-5 shrink-0"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          <span className="hidden sm:inline">Community</span>
        </a>
        <ThemeToggle />
      </div>

      <main className="flex flex-1 flex-col items-center px-6 pb-16 pt-24 text-center sm:px-8 sm:py-24">
        <Image
          src="/opentix-icon.svg"
          alt="Opentix"
          width={72}
          height={72}
          className="mb-8"
          priority
        />

        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Git-native ticket management for Agentic Coders
        </h1>

        <p className="mt-6 max-w-xl px-2 text-lg leading-8 text-muted-foreground sm:px-0">
          Opentix stores tickets as Markdown files in your repository. Visualize
          them on a Kanban board, manage sprints, auto-sync with your team, and
          give AI assistants full ticket context and history — all without leaving your
          editor.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/docs/getting-started/introduction"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
          <Link
            href="/docs"
            className="inline-flex h-12 items-center justify-center rounded-full border border-input px-6 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Documentation
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <a
            href={VSCODE_MARKETPLACE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            VS Code Marketplace
          </a>
          <span className="text-border">|</span>
          <a
            href={VSX_REGISTRY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            VSX Registry
          </a>
          <span className="text-border">|</span>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </main>

      {/* Features Section */}
      <section className="w-full border-t border-border bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-foreground">
            Features
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Implemented Features */}
            <FeatureCard
              title="Kanban Board"
              description="Drag-and-drop board inside IDE to visualize and manage tickets."
              href="/docs/features/kanban-board"
            />
            <FeatureCard
              title="Sprint Management"
              description="Define sprints and breaks, assign tickets, and filter by sprint."
              href="/docs/features/sprint-management"
            />
            <FeatureCard
              title="AI Context"
              description="Auto-detect current ticket from branch name and write context files for AI assistants."
              href="/docs/features/ai-context"
            />
            <FeatureCard
              title="Team & Assignees"
              description="Self-registering team member list. Assign tickets to yourself or teammates."
              href="/docs/features/team-assignees"
            />
            <FeatureCard
              title="Sync & Collaboration"
              description="Background pull/push keeps the team in sync automatically through Git."
              href="/docs/features/sync-collaboration"
            />

            {/* Coming Soon Features */}
            <FeatureCard
              title="CLI"
              description="Standalone command-line interface for AI agents and scripts to manage tickets."
              href="/docs/features/cli"
              comingSoon
            />
            <FeatureCard
              title="Web Kanban Board"
              description="View and manage your Opentix board from the browser — no IDE required."
              href="/docs/features/web-kanban-board"
              comingSoon
            />
            <FeatureCard
              title="Git Event Automations"
              description="Automatically transition ticket status based on branch and pull request events."
              href="/docs/features/git-automations"
              comingSoon
            />
            <FeatureCard
              title="Ticket Attachments"
              description="Attach files and images to ticket descriptions and comments."
              href="/docs/features/ticket-attachments"
              comingSoon
            />
            <FeatureCard
              title="Managed Backend Support"
              description="Hosted sync infrastructure option while keeping the same git-native workflow."
              href="/docs/features/managed-backend-support"
              comingSoon
            />
          </div>
        </div>
      </section>

      {/* Supported IDEs Section */}
      <section className="w-full border-t border-border bg-background px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight text-foreground">
            Supported IDEs
          </h2>
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Opentix works with any IDE that supports VS Code extensions
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <IDEBadge name="VS Code" href="https://code.visualstudio.com" />
            <IDEBadge name="Cursor" href="https://cursor.com/download" />
            <IDEBadge name="Windsurf" href="https://codeium.com/windsurf" />
            <IDEBadge name="Antigravity" href="https://antigravity.google" />
            <IDEBadge name="Eclipse Theia" href="https://theia-ide.org" />
            <IDEBadge name="Gitpod" href="https://www.gitpod.io" />
            <IDEBadge name="Code-Server" href="https://github.com/coder/code-server" />
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        Open source under the{' '}
        <a
          href="https://github.com/jpmadrigal07/opentix/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Apache License 2.0
        </a>
        .
      </footer>
    </div>
  )
}

interface IDEBadgeProps {
  name: string
  href?: string
}

function IDEBadge({ name, href }: IDEBadgeProps) {
  const content = (
    <div className="rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-muted">
      {name}
    </div>
  )

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        {content}
      </a>
    )
  }

  return content
}

interface FeatureCardProps {
  title: string
  description: string
  href: string
  comingSoon?: boolean
}

function FeatureCard({ title, description, href, comingSoon }: FeatureCardProps) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-lg border border-border bg-background p-6 transition-all hover:border-primary/50 hover:shadow-md ${
        comingSoon ? 'opacity-60' : ''
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <h3 className="flex-1 text-xl font-semibold text-foreground group-hover:text-primary">
          {title}
        </h3>
        {comingSoon && (
          <span className="mt-0.5 shrink-0 rounded-full border border-amber-500/50 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            Coming Soon
          </span>
        )}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  )
}
