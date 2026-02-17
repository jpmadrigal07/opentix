import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'
import { defineCollection, defineConfig, s } from 'velite'

const docs = defineCollection({
  name: 'Doc',
  pattern: 'docs/**/*.mdx',
  schema: s
    .object({
      title: s.string(),
      description: s.string().optional(),
      section: s.string().optional().default('General'),
      order: s.number().optional().default(999),
      slug: s.string(),
      toc: s.toc(),
      metadata: s.metadata(),
      body: s.mdx(),
      excerpt: s.excerpt({ length: 5000 }),
      raw: s.raw(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/docs/${data.slug}`,
      searchText: [data.title, data.description, data.excerpt, data.raw]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    })),
})

export default defineConfig({
  root: 'content',
  output: {
    data: '.velite',
    assets: 'public/static',
    base: '/static/',
    name: '[name]-[hash:6].[ext]',
    clean: true,
  },
  collections: { docs },
  mdx: {
    rehypePlugins: [rehypeSlug, rehypePrettyCode],
  },
})
