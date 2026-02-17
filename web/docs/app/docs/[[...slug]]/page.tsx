import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { docs } from '@/.velite'
import type { Doc } from '@/.velite'
import { MDXContent } from '@/components/mdx-content'
import { DocsToc } from '@/components/docs-toc'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { getUrl } from '@/lib/metadata'

const SECTION_ORDER = [
  'Getting Started',
  'Core Concepts',
  'Features',
  'Reference',
  'Contributing',
]

function groupDocsBySection(allDocs: Doc[]) {
  const groups = new Map<string, Doc[]>()

  for (const doc of allDocs) {
    const section = doc.section ?? 'General'
    if (!groups.has(section)) {
      groups.set(section, [])
    }
    groups.get(section)!.push(doc)
  }

  for (const [, groupDocs] of groups) {
    groupDocs.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  }

  const sorted = [...groups.entries()].sort(([a], [b]) => {
    const aIdx = SECTION_ORDER.indexOf(a)
    const bIdx = SECTION_ORDER.indexOf(b)
    const aOrder = aIdx === -1 ? SECTION_ORDER.length : aIdx
    const bOrder = bIdx === -1 ? SECTION_ORDER.length : bIdx
    return aOrder - bOrder
  })

  return sorted
}

interface DocPageProps {
  params: Promise<{ slug?: string[] }>
}

function getDocBySlug(slug: string[] | undefined) {
  const slugStr = slug?.join('/') ?? ''
  return docs.find((doc) => doc.slug === slugStr)
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params
  const isIndex = !slug || slug.length === 0

  if (isIndex) {
    const sections = groupDocsBySection(docs)
    return (
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-6 pt-6 pb-24">
          <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Welcome to the Opentix documentation. Get started with the guides below.
          </p>
          <div className="mt-10 space-y-10">
            {sections.map(([section, sectionDocs]) => (
              <div key={section}>
                <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
                  {section}
                </h2>
                <ul className="space-y-3">
                  {sectionDocs.map((doc) => (
                    <li key={doc.slug}>
                      <Link
                        href={doc.permalink}
                        className="block rounded-lg border border-border px-4 py-3 transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <span className="font-medium">{doc.title}</span>
                        {doc.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{doc.description}</p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const doc = getDocBySlug(slug)
  if (!doc) notFound()

  const toc = Array.isArray(doc.toc) ? doc.toc : []

  return (
    <div className="flex-1 overflow-auto scroll-smooth">
      <div className="mx-auto flex max-w-7xl gap-12 px-6 pt-6 pb-24 xl:pr-72">
        <article className="min-w-0 flex-1">
          <header className="mb-8">
            <Button variant="ghost" size="sm" asChild>
              <Link
                href="/docs"
                className="-ml-2 mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
                Back to docs
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
            {doc.description && (
              <p className="mt-2 text-lg text-muted-foreground">{doc.description}</p>
            )}
          </header>
          <div className="prose dark:prose-invert max-w-none">
            <MDXContent code={doc.body} />
          </div>
        </article>
        <DocsToc toc={toc} />
      </div>
    </div>
  )
}

export async function generateStaticParams() {
  return [
    { slug: [] },
    ...docs.map((doc) => ({ slug: doc.slug.split('/') })),
  ]
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { slug } = await params
  const isIndex = !slug || slug.length === 0
  
  if (isIndex) {
    const url = getUrl("/docs")
    return {
      title: "Documentation",
      description: "Welcome to the Opentix documentation. Get started with guides, tutorials, and API references.",
      alternates: {
        canonical: url,
      },
      openGraph: {
        title: "Documentation - Opentix",
        description: "Welcome to the Opentix documentation. Get started with guides, tutorials, and API references.",
        url,
        type: "website",
      },
      twitter: {
        title: "Documentation - Opentix",
        description: "Welcome to the Opentix documentation. Get started with guides, tutorials, and API references.",
      },
    }
  }
  
  const doc = getDocBySlug(slug)
  if (!doc) return {}
  
  const url = getUrl(doc.permalink)
  const description = doc.description || `Learn about ${doc.title} in the Opentix documentation.`
  
  return {
    title: doc.title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${doc.title} - Opentix`,
      description,
      url,
      type: "article",
    },
    twitter: {
      title: `${doc.title} - Opentix`,
      description,
    },
  }
}
