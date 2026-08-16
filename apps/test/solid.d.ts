import { type getAuth } from '@learning/auth'

declare module '@solidjs/web' {
  interface RequestEventLocals {
    user:
      | NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['api']['getSession']>>>['user']
      | null
  }
}

export {}
