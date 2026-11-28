import type { Output, Transport } from './types'

/**
 * Runs code in the worker `create` makes, the first time it is needed.
 * Vite bundles a worker it sees created as `new Worker(new URL('…', import.meta.url))`, hence the function.
 */
export function createWorkerTransport<O>(create: () => Worker): Transport<O> {
  let worker: Worker | undefined
  return (input, onOutput) => {
    worker ??= create()
    const current = worker
    const listener = (event: MessageEvent<Output>) => {
      if (event.data?.id === input.id) onOutput(event.data)
    }
    current.addEventListener('message', listener)
    current.postMessage(input)
    return () => current.removeEventListener('message', listener)
  }
}

/** Each output of running `code` through `transport`, ending with the `done` one. */
export async function* stream<O>(
  transport: Transport<O>,
  code: string,
  options?: O,
): AsyncGenerator<Output> {
  const id = crypto.randomUUID()
  if (!code) {
    yield { id, result: '', stdout: '', status: 'done' }
    return
  }
  const outputs: Output[] = []
  let wake = () => {}
  const stop = transport({ id, code, options }, (output) => {
    outputs.push(output)
    wake()
  })
  try {
    while (true) {
      if (outputs.length === 0) await new Promise<void>((resolve) => (wake = resolve))
      const output = outputs.shift()!
      yield output
      if (output.status === 'done') return
    }
  } finally {
    stop()
  }
}
