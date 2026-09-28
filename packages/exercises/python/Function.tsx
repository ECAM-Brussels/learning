import { createDerivedStep } from '@learning/core'
import type { FinalOutput } from '@learning/repl'
import * as v from 'valibot'
import { PythonCode } from './Code'

export const PythonFunction = createDerivedStep(
  PythonCode,
  {
    prompt: 'jsx',
    fnName: 'string',
    tests: v.array(
      v.union([
        v.tuple([v.string(), v.string()]),
        v.tuple([v.string(), v.number(), v.literal('stdout')]),
      ]),
    ),
  },
  (props) => ({
    prompt: props.prompt,
    tests: [
      {
        desc: `La fonction ${props.fnName} est bien définie`,
        test: `callable(${props.fnName})`,
        check: ({ result }) => result?.toLowerCase() === 'true',
        ...props.tests.map((test) => ({
          test: `${props.fnName}(${test[0]})`,
          check: (output: FinalOutput) => output.result === test[1],
        })),
      },
    ],
  }),
)

export default PythonFunction
