/// <reference path="../../apps/test/solid-env.d.ts" />
/// <reference types="../../apps/test/node_modules/@solidjs/vite-plugin/boundary-modules" />

import { type getAuth } from '@learning/auth'

declare module '@solidjs/web' {
  interface RequestEventLocals {
    user:
      | NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['api']['getSession']>>>['user']
      | null
  }
}

export {}
