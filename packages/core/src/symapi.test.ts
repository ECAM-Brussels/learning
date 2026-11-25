import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import symapi from './symapi'

const replay = globalThis.fetch
const server = mock(async (_url: string, _init: RequestInit) => Response.json(true))

beforeEach(() => {
  server.mockReset()
  server.mockImplementation(async () => Response.json(true))
  globalThis.fetch = server as unknown as typeof fetch
})
afterEach(() => {
  globalThis.fetch = replay
})

describe('symapi', () => {
  test('posts JSON to the path named by the properties', async () => {
    await symapi.expr.equal({ expr1: 'x', expr2: ['Add', 1, 2] })
    const [url, init] = server.mock.calls[0]!
    expect(url).toBe(`${process.env.SYMAPI_URL}/expr/equal`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(String(init.body))).toEqual({ expr1: 'x', expr2: ['Add', 1, 2] })
  })

  test.each([true, false, null, 3, ['1', '-1'], 'x^{2}'])(
    'returns the response %p',
    async (value) => {
      server.mockImplementation(async () => Response.json(value))
      expect(await symapi.expr.latex({ expr: 'x' })).toEqual(value as any)
    },
  )

  test('rejects with the detail of an error', async () => {
    server.mockImplementation(async () =>
      Response.json({ detail: 'x is not a polynomial in x' }, { status: 422 }),
    )
    await expect(symapi.expr.degree({ expr: 'x', x: 'x' })).rejects.toThrow(
      'HTTP 422: x is not a polynomial in x',
    )
  })

  test('rejects with the whole body when the detail is not a string', async () => {
    const body = { detail: [{ loc: ['body', 'expr'], msg: 'Field required' }] }
    server.mockImplementation(async () => Response.json(body, { status: 422 }))
    await expect(symapi.expr.degree({} as any)).rejects.toThrow(`HTTP 422: ${JSON.stringify(body)}`)
  })

  test('rejects with the status text when the body is not JSON', async () => {
    server.mockImplementation(
      async () =>
        new Response('<h1>oops</h1>', { status: 500, statusText: 'Internal Server Error' }),
    )
    await expect(symapi.expr.isTrue({ expr: 'x' })).rejects.toThrow(
      'HTTP 500: Internal Server Error',
    )
  })

  test('rejects when SymAPI cannot be reached', async () => {
    server.mockImplementation(async () => {
      throw new TypeError('fetch failed')
    })
    await expect(symapi.expr.isTrue({ expr: 'x' })).rejects.toThrow('fetch failed')
  })
})
