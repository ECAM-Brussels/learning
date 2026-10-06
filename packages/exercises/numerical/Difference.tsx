import { createDerivedStep, tex } from '@learning/core'
import * as v from 'valibot'
import { PythonCode } from '../python/Code'

const translations = {
  forward: 'avant',
  backward: 'arrière',
  central: 'centrale',
} as const

export const FiniteDifference = createDerivedStep(
  PythonCode,
  {
    f: 'expr',
    diff: v.optional(v.string(), 'diff'),
    prompt: 'jsx',
    type: v.union([v.literal('forward'), v.literal('backward'), v.literal('central')]),
  },
  (props) => ({
    prompt: (
      <>
        <p>
          Définissez une fonction <code>{props.diff}</code> qui prend deux arguments {tex`x`} et{' '}
          {tex`h`}, et qui retourne la différence {translations[props.type]} de{' '}
          {tex`f(x) = {props.f}`} en {tex`{props.x}`}.
        </p>
      </>
    ),
    tests: [],
  }),
)
