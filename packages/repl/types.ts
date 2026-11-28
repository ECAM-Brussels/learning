/** What a run reports: each step, then the result, what was printed, or the error. */
export type Output =
  | {
      id: string
      result?: string
      error?: string
      stdout?: string
      format?: 'text' | 'latex' | 'image'
      status: 'done'
    }
  | {
      id: string
      status: 'loading' | 'importing' | 'executing'
      error?: never
      result?: never
      stdout?: never
      format?: never
    }

export type FinalOutput = Extract<Output, { status: 'done' }>

export type Input<O = Record<string, unknown>> = {
  id: string
  code: string
  options?: O
}

/**
 * Sends code to run, and calls `onOutput` with each output for it until it is done.
 * Returns a function that stops listening.
 */
export type Transport<O = Record<string, unknown>> = (
  input: Input<O>,
  onOutput: (output: Output) => void,
) => () => void
