import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { transformAsync } from '@solidjs/compiler'
import { plugin } from 'bun'
import { afterEach, expect, mock } from 'bun:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const rootEnv = resolve(import.meta.dir, '../../.env')
// `process.loadEnvFile` is missing from some Bun builds; the root `test` script passes --env-file anyway.
if (existsSync(rootEnv)) process.loadEnvFile?.(rootEnv)

/**
 * DOM globals for component tests.
 * Registered before anything imports `@solidjs/web` so its browser build sees `document`.
 */
const { fetch, Request, Response, Headers } = globalThis
GlobalRegistrator.register({ url: 'http://localhost/' })
// Keep Bun's networking: happy-dom's fetch enforces browser CORS rules on server calls.
Object.assign(globalThis, { fetch, Request, Response, Headers })

/**
 * Compile Solid JSX with Solid's own compiler (Bun's built-in JSX transform is React-style).
 * Run tests with `--conditions=browser` so `solid-js`/`@solidjs/web` resolve to their client builds.
 */
plugin({
  name: 'solid-jsx',
  setup(build) {
    build.onLoad({ filter: /\.[jt]sx$/ }, async ({ path }) => {
      if (path.includes('/node_modules/')) return undefined as never
      const source = await Bun.file(path).text()
      const { code } = await transformAsync(source, {
        filename: path,
        generate: 'dom',
        dev: true,
        moduleName: '@solidjs/web',
      })
      return { contents: code, loader: path.endsWith('.tsx') ? 'ts' : 'js' }
    })
  },
})

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

const matchers = await import('@testing-library/jest-dom/matchers')
expect.extend(matchers as any)

const { cleanup } = await import('@solidjs/testing-library')
afterEach(() => {
  cleanup()
  localStorage.clear()
})
