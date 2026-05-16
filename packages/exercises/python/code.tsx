import CheckMark from '@learning/components/CheckMark'
import { createView, defineFeedback, defineSchema, Python, Tests } from '@learning/core'
import { runPython } from '@learning/repl'
import { mapAsync } from 'es-toolkit'
import { createMemo, For, Show } from 'solid-js'

export const schema = defineSchema({
  name: 'python/code',
  question: {
    tests: Tests('Tests à valider'),
  },
  steps: {
    start: {
      state: {
        attempt: Python('Code Python'),
      },
    },
  },
})

const feedback = defineFeedback<typeof schema>({
  start: async ({ question: { tests }, state: { attempt } }) => {
    const results = await mapAsync(tests, async ({ test, result }) =>
      checkTest(attempt, test, result),
    )
    const passed = results.filter(Boolean).length
    const correct = passed === results.length
    return { correct, score: [passed, results.length], next: null }
  },
})

export const PythonCode = createView(schema, feedback, {
  start: (props, Field) => {
    const results = createMemo(async () => {
      if (!props.state) return []
      return mapAsync(props.question.tests, async ({ test, result }) =>
        checkTest(props.state!.attempt, test, result),
      )
    }, [])
    return (
      <>
        <Field name="state.attempt" />
        <Show when={results().length > 0}>
          <details>
            <summary>
              {results()?.filter(Boolean).length} tests corrects sur {results()?.length}
              <CheckMark value={results()?.every(Boolean)} />
            </summary>
            <For each={results()}>
              {(result, i) => (
                <li>
                  <code>{props.question.tests.at(i())?.test}:</code> <CheckMark value={result()} />
                </li>
              )}
            </For>
          </details>
        </Show>
      </>
    )
  },
})

async function checkTest(code: string, test: string, result: string) {
  const output = await runPython(code + `\n` + test)
  return output.result === result
}

export default PythonCode
