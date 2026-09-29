import { createDerivedStep, omitFromJSON } from '@learning/core'
import type { FinalOutput } from '@learning/repl'
import * as v from 'valibot'
import { PythonCode, Test } from './Code'

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
    tests: omitFromJSON(
      v.array(
        v.union([
          v.object({
            input: v.array(StringLike),
            output: StringLike,
            type: v.optional(v.union([v.literal('stdout'), v.literal('result')]), 'result'),
          }),
          Test,
        ]),
      ),
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
      ...props.tests.map((test) => {
        if ('input' in test) {
          return {
            test: `${props.fnName}(${test.input.join(', ')})`,
            check: (output: FinalOutput) => output[test.type] === test.output,
          }
        }
        return test
      }),
    ],
  }),
)

export default PythonFunction
