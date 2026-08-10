import { query } from '@solidjs/router'
import type { paths } from './symapi.d'

const BASE_URL = process.env.SYMAPI_URL ?? 'http://localhost:8088'

type Folders<Prefix extends string> = keyof paths extends infer K
  ? K extends `${Prefix}/${infer First}/${string}`
    ? First
    : K extends `${Prefix}/${infer First}`
      ? First
      : never
  : never

type Fetch<Path extends keyof paths> = paths[Path] extends { post: infer Post }
  ? Post extends {
      requestBody?: { content: { 'application/json': infer Req } }
      responses: infer Res
    }
    ? (
        params: Req extends undefined ? void : Req,
      ) => Promise<Res extends { 200?: { content: { 'application/json': infer R } } } ? R : unknown>
    : never
  : never

type ApiTree<P extends string> = {
  [K in Folders<P>]: Folders<`${P}/${K}`> extends never
    ? `${P}/${K}` extends keyof paths
      ? Fetch<`${P}/${K}`>
      : never
    : ApiTree<`${P}/${K}`>
}

const symapiRequest = query(async ({ path, body }: { path: string; body: string }) => {
  'use server'
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return await res.json()
}, 'symapi')

function makeProxy<const P extends string>(prefix: P) {
  return new Proxy((() => {}) as any, {
    get(_, attr: Folders<P>) {
      return makeProxy(`${prefix}/${attr}`)
    },
    apply(_, __, [body]: any) {
      return symapiRequest({ path: prefix, body: JSON.stringify(body) })
    },
  }) as ApiTree<P>
}

export default makeProxy('')
