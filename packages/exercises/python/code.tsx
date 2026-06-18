import { CheckMark, Code } from '@learning/components'
import { createStepComponent, Step } from '@learning/core'
import { runPython } from '@learning/repl'
import { mapAsync } from 'es-toolkit'
import { createMemo, For, type JSX } from 'solid-js'
import * as v from 'valibot'

export const PythonExercise = createStepComponent(
  {
    prompt: v.optional(v.custom<JSX.Element>(() => true)),
    tests: v.optional(
      v.array(v.object({ desc: v.optional(v.string()), test: v.string(), result: v.string() })),
      [],
    ),
    math: v.optional(v.boolean(), false),
  },
  (props) => (
    <Step
      id={props.id}
      inputs={{ code: v.string() }}
      feedback={(inputs) => ({
        correct: false,
        tests: mapAsync(props.tests, async (test) => ({
          ...test,
          passed: await checkTest(inputs.state.code, test.test, test.result),
        })),
      })}
      prompt={(inputs) => {
        const code = createMemo(() => inputs.savedState?.code ?? '')
        return (
          <>
            {props.prompt}
            <Code
              lang="python"
              onChange={(newValue) => {
                if (newValue !== (inputs.state.code ?? '')) {
                  inputs.setState('code', newValue)
                }
              }}
              math={props.math}
              children={code()}
            />
          </>
        )
      }}
    >
      {(feedback) => (
        <details>
          <summary>
            {feedback.tests.filter((t) => t.passed).length} tests corrects sur{' '}
            {feedback.tests.length}
            <CheckMark value={feedback.tests.every((t) => t.passed)} />
          </summary>
          <For each={feedback.tests}>
            {(test, i) => (
              <li>
                <code>{test().desc ?? test().test}:</code> <CheckMark value={test().passed} />
              </li>
            )}
          </For>
        </details>
      )}
    </Step>
  ),
)

async function checkTest(code: string, test: string, result: string) {
  for await (const chunk of runPython(`${code}\nprint(${test})`)) {
    if (!chunk.status) {
      return `${chunk.result}${chunk.stdout}` === result
    }
  }
  throw new Error('Python test did not return a result')
}
