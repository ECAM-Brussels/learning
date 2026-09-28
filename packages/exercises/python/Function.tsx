import { createDerivedStep } from '@learning/core'
import type { FinalOutput } from '@learning/repl'
import * as v from 'valibot'
import { PythonCode } from './Code'

const StringLike = v.union([
  v.string(),
  v.pipe(v.number(), v.toString()),
  v.pipe(v.boolean(), v.toString()),
])

export const PythonFunction = createDerivedStep(
  PythonCode,
  {
    prompt: 'jsx',
    fnName: 'string',
    tests: v.array(
      v.object({
        input: v.array(StringLike),
        output: StringLike,
        type: v.optional(v.union([v.literal('stdout'), v.literal('return')]), 'return'),
      }),
    ),
  },
  (props) => ({
    prompt: props.prompt,
    tests: [
      {
        desc: `La fonction ${props.fnName} est bien définie`,
        test: `callable(${props.fnName})`,
        check: ({ result }) => result?.toLowerCase() === 'true',
      },
      ...props.tests.map((test) => ({
        test: `${props.fnName}(${test.input.join(', ')})`,
        check: (output: FinalOutput) => output.result === test.output,
      })),
    ],
  }),
)

export default PythonFunction
