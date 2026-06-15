import { EventIterator } from 'event-iterator'
const worker = new Worker(new URL('./python/worker.ts', import.meta.url), { type: 'module' })

export type Output = {
  id: string
  result?: string
  error?: string
  stdout?: string
  format?: 'text' | 'latex'
}

type Options = {
  math?: boolean
}

export type Input = {
  id: string
  code: string
  options?: Options
}

type Status = 'loading' | 'importing' | 'executing' | 'ready'

export async function* pyodideStatus() {
  const iterator = new EventIterator<Status>(({ push, stop }) => {
    const listener = (event: MessageEvent<{ status?: Status }>) => {
      const status = event.data?.status
      if (!status) return
      push(status)
      if (status === 'ready') stop()
    }
    worker.addEventListener('message', listener)
    return () => worker.removeEventListener('message', listener)
  })
  for await (const status of iterator) {
    yield status
  }
}

export async function runPython(code: string, options?: { math: boolean }) {
  const promiseId = crypto.randomUUID()
  let { promise, resolve } = Promise.withResolvers<Omit<Output, 'id'>>()
  worker.addEventListener('message', function listener(event: MessageEvent<Output>) {
    if (event.data?.id !== promiseId) return
    worker.removeEventListener('message', listener)
    const { id, ...rest } = event.data
    resolve(rest)
  })
  worker.postMessage({ id: promiseId, code, options } satisfies Input)
  return promise
}
