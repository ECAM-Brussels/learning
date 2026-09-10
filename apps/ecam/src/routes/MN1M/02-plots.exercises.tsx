import { PythonCode } from '@learning/exercises/python/Code'
import type { FinalOutput } from '@learning/repl'
import type { JSX } from '@solidjs/web'

export function FunctionExercise<T extends any[]>(props: {
  prompt: JSX.Element
  fnName: string
  tests: [T, string][]
}) {
  return (
    <PythonCode
      prompt={props.prompt}
      tests={[
        {
          desc: `La fonction ${props.fnName} est bien définie`,
          test: `callable(${props.fnName})`,
          check: ({ result }) => result === 'true',
        },
        ...props.tests.map((test) => ({
          test: `${props.fnName}(${test[0].join(',')})`,
          check: (output: FinalOutput) => output.result === test[1],
        })),
      ]}
    />
  )
}
