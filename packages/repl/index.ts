import { EventIterator } from 'event-iterator'
const worker = new Worker(new URL('./python/worker.ts', import.meta.url), { type: 'module' })

type FinalOutput = {
  format: 'text' | 'latex' | 'image'
  result?: string
  stdout?: string
  error?: string
}

export type Output =
  | {
      id: string
      result?: string
      error?: string
      stdout?: string
      format?: 'text' | 'latex' | 'image'
      status?: never
    }
  | {
      id: string
      status: 'loading' | 'importing' | 'executing' | 'ready'
      error?: never
      result?: never
      stdout?: never
      format?: never
    }

type Options = {
  math?: boolean
}

export type Input = {
  id: string
  code: string
  options?: Options
}

async function* run(code: string, options?: { math: boolean }) {
  const promiseId = crypto.randomUUID()
  const iterator = new EventIterator<Output>(({ push, stop }) => {
    const listener = (event: MessageEvent<Output>) => {
      if (event.data?.id !== promiseId) return
      push(event.data)
      if (event.data.status === 'ready') stop()
    }
    worker.addEventListener('message', listener)
    return () => worker.removeEventListener('message', listener)
  })
  worker.postMessage({ id: promiseId, code, options } satisfies Input)
  for await (const status of iterator) {
    yield status
  }
}

async function output(code: string): Promise<FinalOutput> {
  for await (const chunk of run(code)) {
    if (!chunk.status) {
      return chunk as FinalOutput
    }
  }
  throw new Error('No output received')
}

async function test(
  code: string,
  test: string | null,
  check: (output: FinalOutput) => boolean,
): Promise<FinalOutput & { passed: boolean }> {
  const out = await output(`${code}${test ? `\n${test}` : ''}`)
  return { ...out, passed: check(out) }
}

export const python = {
  run,
  test,
  output,
}
