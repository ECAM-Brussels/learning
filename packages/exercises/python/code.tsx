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
      v.array(v.object({ desc: v.optional(v.string()), test: v.string(), expected: v.string() })),
      [],
    ),
    math: v.optional(v.boolean(), false),
  },
  (props) => (
    <Step
      id={props.id}
      inputs={{ code: v.string() }}
      feedback={async (inputs) => {
        const tests = await mapAsync(props.tests, async (test) => ({
          ...test,
          ...(await checkTest(inputs.code, test.test, test.expected)),
        }))
        return {
          correct: tests.every((t) => t.passed),
          tests,
        }
      }}
      prompt={(ctx) => {
        const code = createMemo(() => ctx.savedState?.code ?? '')
        return (
          <>
            {props.prompt}
            <Code
              lang="python"
              onChange={(newValue) => ctx.setState('code', newValue)}
              run
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
                <code>
                  {test().desc ?? test().test} -&gt; {test().result}
                </code>
                <CheckMark value={test().passed} />
              </li>
            )}
          </For>
        </details>
      )}
    </Step>
  ),
)

async function checkTest(code: string, test: string, expected: string) {
  for await (const chunk of runPython(`${code}\nprint(${test})`)) {
    if (!chunk.status) {
      const result = `${chunk.result}${chunk.stdout}`
      return { result, passed: result.trim() === expected.trim() }
    }
  }
  throw new Error('Python test did not return a result')
}
