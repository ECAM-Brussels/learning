import { CheckMark, Code } from '@learning/components'
import { createStep, omitFromJSON } from '@learning/core'
import { python, type Check, type CheckResult } from '@learning/repl'
import { allKeyed, mapAsync } from 'es-toolkit'
import { createMemo, createProjection, For, Show } from 'solid-js'
import * as v from 'valibot'

/** Older checks answer with a boolean, newer ones with a verdict that can explain a failure. */
const verdict = (result: boolean | CheckResult): CheckResult =>
  typeof result === 'boolean' ? { passed: result } : result

type TestCase = { desc?: string; fn: Check }
/** Both test formats, as one list. */
const testsOf = (tests: readonly TestCase[]) => tests

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
    v.custom<(expect: ReturnType<typeof python.expect>) => Record<string, Check>>(
      (val) => typeof val === 'function',
    ),
    v.transform((generator) => {
      return (code: string, options?: { math: boolean }) => {
        const expect = python.expect(code, options)
        return Object.entries(generator(expect)).map(([desc, fn]) => ({ desc, fn }))
      }
    }),
  ),
])

/**
 * A Python exercise: the student writes code in an editor, runs it in the page,
 * and it is corrected by checks written with `expect`.
 * Each check has a description, shown with a check mark or a cross,
 * and the reason when it fails, such as `moyenne([5]) renvoie 5, au lieu de 5.0`.
 * The answer is right when every check passes.
 * Hover `expect`'s methods in `tests` for their description and an example.
 *
 * @example
 * <PythonCode
 *   id="moyenne"
 *   prompt={<p>Définissez une fonction <code>moyenne(l)</code> qui renvoie la moyenne d'une liste.</p>}
 *   initialCode={'def moyenne(l):\n    '}
 *   tests={(expect) => ({
 *     'moyenne est correcte': expect.function('moyenne').toBehaveLike(
 *       'def moyenne(l):\n    return sum(l) / len(l)',
 *       [[[2, 4, 6]], [[5]], [[-1, 1]]],
 *     ),
 *     "statistics n'est pas utilisé": expect.code.not.toImport('statistics'),
 *   })}
 * />
 * // With NumPy and a plot:
 * <PythonCode
 *   id="sinus"
 *   math
 *   prompt={<p>Tracez le graphe de la fonction sinus sur [-3, 3].</p>}
 *   tests={(expect) => ({ 'La courbe est tracée': expect.matplotlib.plot('np.sin(x)', -3, 3) })}
 * />
 */
export const PythonCode = createStep({
  name: 'python/code',
  schema: {
    data: {
      /** The statement, shown above the editor. */
      prompt: 'jsx',
      /**
       * The checks: a function given `expect`, returning a description for each check.
       *
       * @example
       * tests={(expect) => ({
       *   'carre(3) vaut 9': expect.with('carre(3)').toReturn(9),
       *   'La réponse est affichée': expect.toShow(42),
       * })}
       */
      tests: omitFromJSON(Tests),
      /** @deprecated A further check of the code: write it with `expect.code.toSatisfy`. */
      check: omitFromJSON(
        v.optional(v.custom<(code: string) => boolean | Promise<boolean>>(() => true)),
      ),
      /**
       * `'automatic'` runs the code as the student types, by default;
       * `'manual'` runs it only on ▶, for long computations.
       */
      mode: v.optional(v.union([v.literal('automatic'), v.literal('manual')]), 'automatic'),
      /** Adds NumPy and dual numbers, and shows Matplotlib figures and LaTeX results. */
      math: v.optional(v.boolean(), false),
      /** The code in the editor at first, to complete: `\n` starts a new line. */
      initialCode: v.optional(v.string(), ''),
    },
    inputs: { code: v.string() },
  },
  grade: async (ctx) => {
    const { tests, codeCheck } = await allKeyed({
      tests: mapAsync(
        testsOf(ctx.data.tests(ctx.inputs.code, { math: ctx.data.math ?? false })),
        async (t) => t.fn(),
      ),
      codeCheck: ctx.data.check?.(ctx.inputs.code),
    })
    return tests.every((test) => verdict(test).passed) && codeCheck !== false
  },
  initialState: (data) => ({ code: data.initialCode }),
  prompt: (ctx) => {
    return (
      <>
        {ctx.data.prompt}
        <Code
          lang="python"
          children={ctx.state.current.code ?? ctx.data.initialCode}
          onChange={ctx.state.set.bind(null, 'code')}
          math={ctx.data.math}
          run={ctx.state.saved?.code ?? true}
          mode={ctx.data.mode}
        />
      </>
    )
  },
  feedback: (ctx) => {
    const tests = createProjection(
      () =>
        mapAsync(
          testsOf(ctx.data.tests(ctx.inputs.code, { math: ctx.data.math ?? false })),
          async (t) => ({
            desc: t.desc,
            ...verdict(await t.fn()),
          }),
        ),
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
                <Show when={test.message}>
                  <div class="text-sm whitespace-pre-wrap text-red-800">{test.message}</div>
                </Show>
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
