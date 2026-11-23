import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { transformAsync } from '@solidjs/compiler'
import { plugin } from 'bun'
import { afterEach, expect } from 'bun:test'

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

const matchers = await import('@testing-library/jest-dom/matchers')
expect.extend(matchers as any)

const { cleanup } = await import('@solidjs/testing-library')
afterEach(() => {
  cleanup()
  localStorage.clear()
})
