// Ambient declarations must live in a file without top-level imports/exports,
// otherwise `declare module` is treated as an augmentation and wildcards don't apply.
declare module '*.mdx' {
  import type { Component } from 'solid-js'
  const MDXContent: Component<Record<string, unknown>>
  export const frontmatter: Record<string, unknown>
  export default MDXContent
}
