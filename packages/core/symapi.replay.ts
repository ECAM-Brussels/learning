import { afterAll } from 'bun:test'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import stringify from 'safe-stable-stringify'

export type Exchange = { path: string; body: unknown; status: number; response: unknown }

/** Shared with SymAPI's tests, which check that it still gives every recorded response. */
export const contractFile = resolve(import.meta.dir, '../../apps/symapi/tests/contract.json')

const origin = 'http://symapi.test'
const key = (path: string, body: unknown) => `${path} ${stringify(body)}`
const requests: { path: string; body: unknown }[] = []

/** Requests made to SymAPI since the last call. */
export function takeSymapiRequests() {
  return requests.splice(0)
}

/**
 * Answers requests to SymAPI from the contract, so that tests don't need it running.
 * With SYMAPI_RECORD set, forwards them to the SymAPI at SYMAPI_URL instead,
 * and replaces the contract with the exchanges of this run.
 */
export function replaySymapi() {
  const recording = !!process.env.SYMAPI_RECORD
  const upstream = process.env.SYMAPI_URL
  if (recording && !upstream) throw new Error('Recording needs SYMAPI_URL to reach SymAPI')
  process.env.SYMAPI_URL = origin

  const contract: Exchange[] = recording ? [] : JSON.parse(readFileSync(contractFile, 'utf8'))
  const exchanges = new Map(contract.map((e) => [key(e.path, e.body), e]))
  const realFetch = globalThis.fetch
  let failed = false

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input)
    if (!url.startsWith(origin)) return realFetch(input, init)
    const path = url.slice(origin.length)
    const body = JSON.parse(String(init?.body))
    requests.push({ path, body })
    let exchange = exchanges.get(key(path, body))
    if (!exchange) {
      if (!recording) {
        throw new Error(
          `SymAPI was never asked ${key(path, body)}: ` +
            'record it with `bun run test:record` in packages/core, with SymAPI running',
        )
      }
      try {
        const res = await realFetch(upstream + path, init)
        exchange = { path, body, status: res.status, response: await res.json() }
      } catch (error) {
        failed = true
        throw error
      }
      exchanges.set(key(path, body), exchange)
    }
    return Response.json(exchange.response, { status: exchange.status })
  }) as typeof fetch

  if (recording) {
    afterAll(() => {
      if (failed) {
        console.error('SymAPI did not answer every request: contract.json was left as it was')
        return
      }
      const sorted = [...exchanges.entries()].sort(([a], [b]) => a.localeCompare(b))
      const contract = sorted.map(([, exchange]) => exchange)
      writeFileSync(contractFile, JSON.stringify(contract, null, 2) + '\n')
    })
  }
}
