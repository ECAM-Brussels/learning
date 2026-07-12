import { CheckMark, Code } from '@learning/components'
import { createStep, omitFromJSON } from '@learning/core'
import { python } from '@learning/repl'
import type { JSX } from '@solidjs/web'
import { allKeyed, mapAsync } from 'es-toolkit'
import { createMemo, createProjection, For, Show } from 'solid-js'
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
      check: omitFromJSON(
        v.optional(v.custom<(code: string) => boolean | Promise<boolean>>(() => true)),
      ),
      math: v.optional(v.boolean(), false),
      initialCode: v.optional(v.string(), ''),
    },
    inputs: { code: v.string() },
  },
  grade: async (ctx) => {
    const { tests, codeCheck } = await allKeyed({
      tests: mapAsync(ctx.data.tests, (t) => python.test(ctx.inputs.code, t.test, t.check)),
      codeCheck: ctx.data.check?.(ctx.inputs.code),
    })
    return tests.every((t) => t.passed) && codeCheck !== false
  },
  prompt: (ctx) => (
    <>
      {ctx.data.prompt}
      <Code
        lang="python"
        children={ctx.state.current.code ?? ctx.data.initialCode}
        onChange={ctx.state.set.bind(null, 'code')}
        math={ctx.data.math}
        run
      />
    </>
  ),
  feedback: (ctx) => {
    const tests = createProjection(
      () =>
        mapAsync(ctx.data.tests, async (t) => ({
          ...t,
          ...(await python.test(ctx.inputs.code, t.test, t.check)),
        })),
      [],
    )
    const valid = createMemo(() => ctx.data.check?.(ctx.inputs.code))
    return (
      <details class="not-prose">
        <summary>
          {tests.filter((t) => t.passed).length} tests corrects sur {tests.length}
          <CheckMark value={tests.every((t) => t.passed) && valid() !== false} />
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
        <Show when={valid() !== undefined}>
          {
            <li>
              Le code est valide <CheckMark value={valid()} />
            </li>
          }
        </Show>
      </details>
    )
  },
})
