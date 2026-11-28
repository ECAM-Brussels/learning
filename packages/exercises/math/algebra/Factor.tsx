import { Attempt } from '@learning/components'
import { createStep, expr, tex } from '@learning/core'
import { Show } from 'solid-js'
import { Root } from './Root'

/**
 * Asks to factor a polynomial completely.
 * The answer must equal the polynomial and be factored, however it is written:
 * `(x - 2)(x - 3)` and `(3 - x)(2 - x)` are both right.
 * After a wrong answer, the student is guided:
 * find a root, then the factor of that root, then factor again.
 * A video on factoring is shown beside it.
 *
 * @example
 * <Factor id="factorisation" expr="x^2 - 5x + 6" />
 * // In a series:
 * <Sequence id="factorisations">
 *   <Factor expr="x^2 - 9" />
 *   <Factor expr="2x^2 + 4x + 2" />
 * </Sequence>
 */
export const Factor = createStep({
  name: 'math/algebra/factor',
  schema: {
    data: {
      /** The polynomial to factor, in LaTeX, such as `'x^2 - 5x + 6'`. */
      expr: 'expr',
    },
    inputs: { attempt: 'expr' },
  },
  options: {
    video: 'https://youtube.com/embed/32u4Pr0-XDk',
  },
  prompt: (ctx) => (
    <>
      <p>
        Factorise <strong>complètement</strong> l'expression suivante:
      </p>
      <Attempt>
        {tex`${ctx.data.expr} =`} {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  grade: ({ inputs: { attempt }, data: { expr } }) => [attempt.isEqual(expr), attempt.isFactored()],
  feedback: (ctx) => (
    <Show when={!ctx.correct}>
      <Root expr={ctx.data.expr}>
        {(rootCtx) => (
          <FactorFromRoot root={rootCtx.inputs.root}>
            <ctx.Self />
          </FactorFromRoot>
        )}
      </Root>
    </Show>
  ),
})

const FactorFromRoot = createStep({
  name: 'math/algebra/factor-from-root',
  schema: {
    data: { root: 'expr' },
    inputs: { factor: 'expr' },
  },
  grade: (ctx) => ctx.inputs.factor.isEqual(expr(`x - a`).subs({ a: ctx.data.root })),
  prompt: (ctx) => (
    <>
      <p>
        Quel facteur est associé à la racine <strong>{tex`${ctx.data.root}`}</strong> ?
      </p>
      <Attempt>
        {tex`y =`} {ctx.inputs.factor}
      </Attempt>
    </>
  ),
  feedback: (ctx) => {
    function factor(subs?: boolean) {
      const expr = ctx.inputs.factor
      return subs ? expr.subs({ x: ctx.data.root }).simplify() : expr
    }
    return (
      <Show when={!ctx.correct}>
        <p>
          N'oubliez pas que le facteur {tex`${factor()}`} doit également avoir comme racine{' '}
          {tex`${ctx.data.root}`}. Cependant, dans ce cas-ci, on a
        </p>
        {tex`
          ${factor()}
          = ${factor(true)}
          = ${factor(true).simplify()}
        `}
        <ctx.Self />
      </Show>
    )
  },
})
