import { CheckMark, Code } from '@learning/components'
import { createStep, omitFromJSON } from '@learning/core'
import { python } from '@learning/repl'
import type { MaybePromise } from 'bun'
import { allKeyed, mapAsync } from 'es-toolkit'
import { createEffect, createMemo, createProjection, For, Show } from 'solid-js'
import * as v from 'valibot'

// Old test format, deprecated
export const Test = v.union([
  v.pipe(
    v.object({
      desc: v.optional(v.string()),
      test: v.union([v.string(), v.null()]),
      check: v.custom<Parameters<typeof python.test>[2]>(() => true),
    }),
    v.transform((test) => {
      return {
        desc: test.desc,
        test: (code: string) => python.test(code, test.test, test.check).then((res) => res.passed),
      }
    }),
  ),
  v.object({
    desc: v.optional(v.string()),
    test: v.custom<(code: string) => boolean | Promise<boolean>>(
      (val) => typeof val === 'function',
    ),
  }),
])

export const Tests = v.union([
  v.pipe(
    v.array(Test),
    v.transform((tests) => {
      return (code: string) => {
        return tests.map((t) => ({
          desc: t.desc,
          fn: () => t.test(code),
        }))
      }
    }),
  ),
  v.pipe(
    v.custom<
      (
        expect: (desc: string) => ReturnType<typeof python.expect>,
      ) => { desc?: string; fn: () => MaybePromise<boolean> }[]
    >((val) => typeof val === 'function'),
    v.transform((generator) => {
      return (code: string, options?: { math: boolean }) => {
        const expect = (desc: string) => python.expect(code, options).desc(desc)
        return generator(expect)
      }
    }),
  ),
])

export const PythonCode = createStep({
  name: 'python/code',
  schema: {
    data: {
      prompt: 'jsx',
      tests: omitFromJSON(Tests),
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
      tests: mapAsync(
        ctx.data.tests(ctx.inputs.code, { math: ctx.data.math ?? false }),
        async (t) => t.fn(),
      ),
      codeCheck: ctx.data.check?.(ctx.inputs.code),
    })
    return tests.every(Boolean) && codeCheck !== false
  },
  prompt: (ctx) => {
    createEffect(
      () => [ctx.state.current.code, ctx.data.initialCode] as const,
      ([current, initial]) => {
        if (current === undefined) {
          ctx.state.set('code', initial)
        }
      },
    )
    return (
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
    )
  },
  feedback: (ctx) => {
    const tests = createProjection(
      () =>
        mapAsync(ctx.data.tests(ctx.inputs.code, { math: ctx.data.math ?? false }), async (t) => ({
          desc: t.desc,
          passed: await t.fn(),
        })),
      [],
    )
    const passed = createMemo(() => tests.filter((t) => t.passed).length)
    const valid = createMemo(() => ctx.data.check?.(ctx.inputs.code))
    return (
      <details class="not-prose">
        <summary>
          {passed()} test{passed() !== 1 ? 's' : ''} correct{passed() !== 1 ? 's' : ''} sur{' '}
          {tests.length}
          <CheckMark value={tests.every((t) => t.passed) && valid() !== false} />
        </summary>
        <ul class="list-disc pl-4">
          <For each={tests}>
            {(test) => (
              <li>
                <code>{test.desc ?? 'Résultat final'}</code> <CheckMark value={test.passed} />
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
        </ul>
      </details>
    )
  },
})
