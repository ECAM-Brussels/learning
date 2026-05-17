import CheckMark from '@learning/components/CheckMark'
import { createView, defineFeedback, defineSchema, Math } from '@learning/core'
import { createMemo } from 'solid-js'
import * as start from './start'

export const schema = defineSchema({
  name: 'math/factor',
  question: { expr: Math('Expression à factoriser') },
  steps: {
    start: {
      state: {
        attempt: Math('Tentative'),
      },
    },
    root: {
      state: {
        root: Math('Racine'),
      },
    },
  },
})

export const feedback = defineFeedback<typeof schema>({
  start: start.feedback,
  root: async ({ question: { expr: question }, state: { root } }) => {
    const correct = await question.checkRoot(root)
    return { correct, score: [0, 0], next: null }
  },
})

/**
 * Exercise asking to fully factor a given expression
 *
 * @example
 * // The expression can be entered as a LaTeX string
 * <Factor expr="x^2 - 5x + 6" />
 *
 * @example
 * // To calculate the expression at build time, use the `$` macro
 * <Factor expr={$(() => expr('(x - 2) (x - 3)').expand().latex())}
 *
 * @example
 * // To generate a random expression, use `createMemo`
 * // or use the `Practice` component.
 * <Scope>
 *  {() => {
 *     const [a, b] = sampleSize([1, 2, 3, 4, 5], 2)
 *     const question = createMemo(() => expr(`(x - ${a})(x - ${b})`).expand().latex())
 *     return <Factor expr={question()} />
 *   }}
 * </Scope>
 */
export const Factor = createView(schema, feedback, {
  start: start.Component,
  root: (props, { Field }) => {
    const root = createMemo(() => props.state?.root)
    const question = createMemo(() => props.question.expr)
    const correct = createMemo(() => root() && question().checkRoot(root()!))
    return (
      <>
        <p>
          Trouvez une racine de <Field name="question.expr" />
        </p>
        <div class="flex items-center justify-center gap-1">
          <p>Racine:</p>
          <Field name="state.root" />
          <CheckMark value={correct()} />
        </div>
      </>
    )
  },
})

export default Factor
