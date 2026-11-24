/**
 * `tsc`, extended to type-check MDX files with the same engine as the MDX editor extension.
 * Settings come from the `mdx` section of tsconfig.json.
 */
import { createMdxLanguagePlugin, resolvePlugins } from '@mdx-js/language-service'
import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = new URL('../tsconfig.json', import.meta.url)
const { config } = ts.readConfigFile(root.pathname, ts.sys.readFile)
const names = (config.mdx?.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p))
const loaded = Object.fromEntries(
  await Promise.all(names.map(async (name) => [name, (await import(name)).default])),
)
const [remarkPlugins, virtualCodePlugins] = resolvePlugins(config.mdx, (name) => loaded[name])

runTsc(require.resolve('typescript/lib/tsc'), ['.mdx'], (_ts, options) => [
  createMdxLanguagePlugin(
    remarkPlugins,
    virtualCodePlugins,
    config.mdx?.checkMdx ?? false,
    options.options.jsxImportSource ?? 'react',
  ),
])
