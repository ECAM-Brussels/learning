import { Attempt } from '@learning/components'
import { createStep, schemas, tex, type Expression } from '@learning/core'
import { Show } from 'solid-js'
import * as v from 'valibot'

/**
 * A question answered with a formula, corrected by a function of your own:
 * the quickest way to ask a one-off question in a page.
 * For a question asked often, create a step, or derive one from `Simple` with `createDerivedStep`.
 *
 * @example
 * <Simple
 *   id="integrale"
 *   prompt={<p>Que vaut {tex`\int_0^1 x^2 \, \mathrm{d}x`} ?</p>}
 *   label="\int_0^1 x^2 \, \mathrm{d}x ="
 *   grade={(attempt) => attempt.isEqual('\frac{1}{3}')}
 * />
 */
export const Simple = createStep({
  schema: {
    data: {
      /** The statement: text or JSX. */
      prompt: 'jsx',
      /** What precedes the field, `Réponse:` by default: LaTeX when it contains `=`, or text or JSX. */
      label: v.optional(schemas.jsx),
      /** Whether `label` is LaTeX, when the presence of `=` doesn't tell. */
      tex: v.optional(v.boolean()),
      /** Whether the answer, an expression of `expr`, is right. */
      grade: v.custom<(attempt: Expression<'output'>) => boolean | Promise<boolean>>(() => true),
    },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => {
    const isTex = () => {
      if (ctx.data.tex !== undefined) return ctx.data.tex
      return typeof ctx.data.label === 'string' && (ctx.data.label?.includes('=') ?? false)
    }
    return (
      <>
        <div>{ctx.data.prompt}</div>
        <Attempt>
          <Show
            when={isTex()}
            fallback={ctx.data.label ?? 'Réponse:'}
          >{tex`${ctx.data.label as string}`}</Show>
          {ctx.inputs.attempt}
        </Attempt>
      </>
    )
  },
  grade: (ctx) => ctx.data.grade(ctx.inputs.attempt),
})
