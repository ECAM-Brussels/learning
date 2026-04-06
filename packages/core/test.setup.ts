import { mock } from 'bun:test'

mock.module('@solidjs/router', () => ({
  query: (fn: any) => fn,
}))
