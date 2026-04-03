const worker = new Worker(new URL('./python/worker.ts', import.meta.url), { type: 'module' })

export type Output = {
  id: string
  result?: string
  error?: string
  stdout?: string
}

export type Input = {
  id: string
  code: string
}

export async function pyodideStatus() {
  let { promise, resolve } = Promise.withResolvers<boolean>()
  worker.addEventListener('message', function listener(event: MessageEvent<{ status: 'ready' }>) {
    if (event.data?.status !== 'ready') return
    resolve(true)
  })
  return promise
}

export async function runPython(code: string) {
  const promiseId = crypto.randomUUID()
  let { promise, resolve } = Promise.withResolvers<Omit<Output, 'id'>>()
  worker.addEventListener('message', function listener(event: MessageEvent<Output>) {
    if (event.data?.id !== promiseId) return
    worker.removeEventListener('message', listener)
    const { id, ...rest } = event.data
    resolve(rest)
  })
  worker.postMessage({ id: promiseId, code } satisfies Input)
  return promise
}
