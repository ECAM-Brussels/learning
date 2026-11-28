import { createDerivedStep, ExerciseOptions, tex } from '@learning/core'
import { DerivativeAtPoint } from '@learning/exercises/math/calculus/DerivativeAtPoint'
import { python } from '@learning/repl'
import { dedent } from 'es-toolkit/string'
import * as v from 'valibot'
import { PythonCode } from '../python/Code'

const translations = {
  forward: 'avant',
  backward: 'arrière',
  central: 'centrale',
  undefined: '',
} as const

/**
 * Asks to compute a difference quotient with Python:
 * forward, backward or central, for a function, a point and a step.
 * Once right, the theoretical derivative is asked, with `DerivativeAtPoint`.
 *
 * @example
 * <DifferentialQuotient id="quotient" f="\sin x" x="1" h="0.01" type="central" />
 */
export const DifferentialQuotient = createDerivedStep(
  PythonCode,
  {
    /** The function of `x`, in LaTeX. */
    f: 'expr',
    /** The point, in LaTeX. */
    x: 'expr',
    /** The step, in LaTeX. */
    h: 'expr',
    /** `'forward'` (the default), `'backward'` or `'central'`. */
    type: v.optional(v.union([v.literal('forward'), v.literal('backward'), v.literal('central')])),
  },
  (props) => ({
    prompt: (
      <>
        <p>
          Avec l'aide de Python, calculez le{' '}
          <em>quotient différentiel {translations[props.type ?? 'undefined']}</em> de{' '}
          {tex`f(x) = ${props.f}`} en {tex`a = ${props.x}`} avec un pas {tex`h = ${props.h}`}.
        </p>
      </>
    ),
    tests: [
      {
        desc: 'La valeur finale est correcte',
        test: null,
        check: async ({ stdout }) => {
          const output = await python.output(dedent /* python */ `
            import numpy as np
            f = lambda x: ${props.f.python()}
            x = ${props.x.python()}
            h = ${props.h.python()}
            if "${props.type}" == "forward" or "${props.type}" == "undefined":
                output = (f(x + h) - f(x)) / h
            elif "${props.type}" == "backward":
                output = (f(x) - f(x - h)) / h
            elif "${props.type}" == "central":
                output = (f(x + h) - f(x - h)) / (2 * h)
            output
          `)
          return stdout === output?.stdout
        },
      },
    ],
  }),
  {
    children: (ctx) => (
      <ExerciseOptions allowResubmissions={false}>
        <p>Comparons cela au résultat théorique.</p>
        <DerivativeAtPoint f={ctx.data.f} x={ctx.data.x} />
      </ExerciseOptions>
    ),
  },
)
