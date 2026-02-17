import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ThemeToggle } from '@/components/theme-toggle'
import { getUrl } from '@/lib/metadata'

const GITHUB_URL = 'https://github.com/jpmadrigal07/opentix'
const VSCODE_MARKETPLACE_URL =
  'https://marketplace.visualstudio.com/items?itemName=opentix.opentix'

export const metadata: Metadata = {
  title: 'Opentix - Git-native ticket management for VS Code',
  description:
    'Manage tickets as Markdown files in your repository. Kanban board, sprint management, AI context, and auto-sync — all inside VS Code.',
  alternates: {
    canonical: getUrl('/'),
  },
  openGraph: {
    title: 'Opentix - Git-native ticket management for VS Code',
    description:
      'Manage tickets as Markdown files in your repository. Kanban board, sprint management, AI context, and auto-sync — all inside VS Code.',
    url: getUrl('/'),
  },
}

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background font-sans">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <Image
          src="/opentix-icon.svg"
          alt="Opentix"
          width={72}
          height={72}
          className="mb-8"
          priority
        />

        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Git-native ticket management for VS Code
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
          Opentix stores tickets as Markdown files in your repository. Visualize
          them on a Kanban board, manage sprints, auto-sync with your team, and
          give AI assistants full ticket context — all without leaving your
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

        <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
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
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        Open source under the MIT License.
      </footer>
    </div>
  )
}
