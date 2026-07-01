import { CheckMark, Code } from '@learning/components'
import { createStep, omitFromJSON } from '@learning/core'
import { python } from '@learning/repl'
import type { JSX } from '@solidjs/web'
import { mapAsync } from 'es-toolkit'
import { For, createProjection } from 'solid-js'
import * as v from 'valibot'

export const PythonCode = createStep({
  name: 'python/code',
  schema: {
    data: {
      prompt: omitFromJSON(v.custom<JSX.Element>(() => true)),
      tests: omitFromJSON(
        v.array(
          v.object({
            desc: v.optional(v.string()),
            test: v.union([v.string(), v.null()]),
            check: v.custom<Parameters<typeof python.test>[2]>(() => true),
          }),
        ),
      ),
      math: v.optional(v.boolean(), false),
    },
    inputs: { code: v.string() },
  },
  correct: async (ctx) => {
    const res = await mapAsync(ctx.data.tests, (t) => python.test(ctx.inputs.code, t.test, t.check))
    return res.every((t) => t.passed)
  },
  prompt: (ctx) => (
    <>
      {ctx.data.prompt}
      <Code
        lang="python"
        children={ctx.state.current.code ?? ''}
        onChange={ctx.state.set.bind(null, 'code')}
        run
      />
    </>
  ),
  feedback: (ctx) => {
    const tests = createProjection(() => {
      return mapAsync(ctx.data.tests, async (t) => ({
        ...t,
        ...(await python.test(ctx.inputs.code, t.test, t.check)),
      }))
    }, [])
    return (
      <details class="not-prose">
        <summary>
          {tests.filter((t) => t.passed).length} tests corrects sur {tests.length}
          <CheckMark value={tests.every((t) => t.passed)} />
        </summary>
        <For each={tests}>
          {(test) => (
            <li>
              <code>
                {test.desc ?? test.test} -&gt; {test.result}
                {test.stdout}
              </code>
              <CheckMark value={test.passed} />
            </li>
          )}
        </For>
      </details>
    )
  },
})
