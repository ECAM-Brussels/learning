import { createView, defineFeedback, defineSchema, fields } from '@learning/core'
import * as factorFromRoot from './factorFromRoot'
import * as root from './root'
import * as start from './start'

export const schema = defineSchema({
  name: 'math/factor',
  question: { expr: fields.Math('Expression à factoriser') },
  steps: {
    start: {
      state: {
        attempt: fields.Math('Tentative'),
      },
    },
    root: {
      previous: ['start'],
      state: {
        root: fields.Math('Racine'),
      },
    },
    factorFromRoot: {
      previous: ['root'],
      state: {
        factor: fields.Math('Facteur associé à la racine'),
      },
    },
  },
})

export const feedback = defineFeedback<typeof schema>({
  start: start.feedback,
  root: root.feedback,
  factorFromRoot: factorFromRoot.feedback,
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
 *     const question = createMemo(() => {
 *       const [a, b] = sampleSize([1, 2, 3, 4, 5], 2)
 *       expr(`(x - ${a})(x - ${b})`).expand().latex()
 *     })
 *     return <Factor expr={question()} />
 *   }}
 * </Scope>
 */
export const Factor = createView(schema, feedback, {
  start: start.Component,
  root: root.Component,
  factorFromRoot: factorFromRoot.Component,
})

export default Factor
