import { createDerivedStep, tex } from '@learning/core'
import { DerivativeAtPoint } from '@learning/exercises/math/calculus/DerivativeAtPoint'
import { python } from '@learning/repl'
import { dedent } from 'es-toolkit/string'
import * as v from 'valibot'
import { PythonCode } from '../python/Code'

const translations = {
  forward: 'avant',
  backward: 'arrière',
  central: 'centrale',
} as const

export const DifferentialQuotient = createDerivedStep(
  PythonCode,
  {
    f: 'expr',
    x: 'expr',
    h: 'expr',
    type: v.union([v.literal('forward'), v.literal('backward'), v.literal('central')]),
  },
  (props) => ({
    prompt: (
      <>
        <p>
          Avec l'aide de Python, calculez le{' '}
          <em>quotient différentiel {translations[props.type]}</em> de {tex`${props.f}`} en{' '}
          {tex`x = ${props.x}`} avec un pas {tex`h = ${props.h}`}.
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
            if "${props.type}" == "forward":
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
      <>
        <p>Comparons cela au résultat théorique.</p>
        <DerivativeAtPoint f={ctx.data.f} x={ctx.data.x} />
      </>
    ),
  },
)
