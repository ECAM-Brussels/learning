import { Python } from '@learning/components'
import type { JSX } from '@solidjs/web'
import dedent from 'dedent'
import { createMemo } from 'solid-js'

type Options = {
  math?: boolean
}

function makePy(options: Options) {
  return (strings: TemplateStringsArray, ...values: unknown[]) => {
    const code = createMemo(() => dedent(String.raw(strings, ...values)))
    return <Python class="" value={code()} math={options.math} />
  }
}

export function py(first: TemplateStringsArray, ...rest: unknown[]): JSX.Element
export function py(first: Options, ...rest: never[]): ReturnType<typeof makePy>
export function py(first: TemplateStringsArray | Options, ...rest: unknown[]) {
  if (Array.isArray(first) && 'raw' in first) {
    return makePy({ math: false })(first, ...rest)
  }
  return makePy(first as Options)
}
