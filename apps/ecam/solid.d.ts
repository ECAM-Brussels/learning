/// <reference path="./solid-env.d.ts" />
/// <reference types="./node_modules/@solidjs/vite-plugin/boundary-modules" />

import { type getAuth } from '@learning/auth'
import { type getRole } from '@learning/core'

declare module '@solidjs/web' {
  interface RequestEventLocals {
    user:
      | NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['api']['getSession']>>>['user']
      | null
    role: Awaited<ReturnType<typeof getRole>>
  }
}

declare module '*.mdx' {
  import type { ComponentType } from 'preact'
  const MDXContent: ComponentType<Record<string, unknown>>
  export const frontmatter: Record<string, unknown>
  export default MDXContent
}

export {}
