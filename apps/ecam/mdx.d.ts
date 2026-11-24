// Ambient declarations must live in a file without top-level imports/exports,
// otherwise `declare module` is treated as an augmentation and wildcards don't apply.
declare module '*.mdx' {
  import type { Component } from 'solid-js'
  const MDXContent: Component<Record<string, unknown>>
  export const frontmatter: Record<string, unknown>
  export default MDXContent
}

// Components the layout passes to every MDX page (see `MDXProvider` in src/Layout.tsx),
// so that the MDX type checker knows them when a page uses them without importing them.
interface MDXProvidedComponents {
  Code: typeof import('@learning/components').Code
  Highlight: typeof import('@learning/components').Highlight
  Latex: typeof import('@learning/components').Latex
  Steps: typeof import('@learning/components').Steps
}
