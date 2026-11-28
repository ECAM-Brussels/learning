import type { Input, Output, Transport } from './types'

type Run = { input: Input<never>; onOutput: (output: Output) => void; timer?: Timer }
type Timer = ReturnType<typeof setTimeout>

export type WorkerOptions<O> = {
  /** Milliseconds a run may execute for, from its `executing` step; none if undefined. */
  timeout?: (input: Input<O>) => number | undefined
  /** The error of a run stopped by its timeout. */
  timeoutError?: (milliseconds: number) => string
}

/**
 * Runs code in the worker `create` makes, the first time it is needed.
 * Vite bundles a worker it sees created as `new Worker(new URL('…', import.meta.url))`, hence the function.
 * A run that executes for longer than its timeout, such as an infinite loop, stops the worker:
 * the run reports an error, and the runs waiting behind it start again in a new worker.
 */
export function createWorkerTransport<O>(
  create: () => Worker,
  options: WorkerOptions<O> = {},
): Transport<O> {
  let worker: Worker | undefined
  const runs = new Map<string, Run>()

  function start() {
    const current = create()
    current.addEventListener('message', (event: MessageEvent<Output>) => {
      const run = runs.get(event.data?.id)
      if (!run || current !== worker) return
      if (event.data.status === 'executing') {
        const milliseconds = options.timeout?.(run.input as Input<O>)
        if (milliseconds !== undefined) {
          run.timer = setTimeout(() => stop(run, milliseconds), milliseconds)
        }
      }
      if (event.data.status === 'done') {
        clearTimeout(run.timer)
        runs.delete(run.input.id)
      }
      run.onOutput(event.data)
    })
    return current
  }

  function stop(run: Run, milliseconds: number) {
    worker?.terminate()
    worker = undefined
    runs.delete(run.input.id)
    run.onOutput({
      id: run.input.id,
      status: 'done',
      error: options.timeoutError?.(milliseconds) ?? `Stopped after ${milliseconds} ms`,
    })
    const waiting = [...runs.values()]
    if (waiting.length === 0) return
    worker = start()
    for (const other of waiting) {
      clearTimeout(other.timer)
      worker.postMessage(other.input)
    }
  }

  return (input, onOutput) => {
    worker ??= start()
    runs.set(input.id, { input: input as Input<never>, onOutput })
    worker.postMessage(input)
    return () => {
      clearTimeout(runs.get(input.id)?.timer)
      runs.delete(input.id)
    }
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
