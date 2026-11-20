import { mock } from 'bun:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const rootEnv = resolve(import.meta.dir, '../../.env')
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

mock.module('@solidjs/router', () => ({
  query: (fn: any) => fn,
}))
