import { type auth } from '@learning/auth'

declare module '@solidjs/web' {
  interface RequestEventLocals {
    user: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>['user']
  }
}

export {}
