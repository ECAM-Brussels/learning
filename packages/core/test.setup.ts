import { mock } from 'bun:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import '../components/test.setup'
import { replaySymapi } from './src/symapi.replay'

const rootEnv = resolve(import.meta.dir, '../../.env')
// `process.loadEnvFile` is missing from some Bun builds; the root `test` script passes --env-file anyway.
if (existsSync(rootEnv)) process.loadEnvFile?.(rootEnv)
replaySymapi()

/**
 * Minimal `@solidjs/router` fake.
 *
 * `query` keeps the wrapped function callable outside a router, but reads a shared
 * version signal so `revalidate` re-runs any memo that fetched through it,
 * mirroring how the real router refreshes cached queries after an action.
 */
mock.module('@solidjs/router', async () => {
  const { createSignal } = await import('solid-js')
  const [version, setVersion] = createSignal(0, { name: 'router-version' })
  return {
    query: (fn: (...args: any[]) => any, name: string) =>
      Object.assign(
        (...args: any[]) => {
          version()
          return fn(...args)
        },
        {
          key: name,
          keyFor: (...args: any[]) => name + JSON.stringify(args),
        },
      ),
    revalidate: () => setVersion((v) => v + 1),
    useLocation: () => ({ pathname: globalThis.location?.pathname ?? '/' }),
    formAction: (fn: any) => fn,
  }
})
