import { Attempt } from '@learning/components'
import { createStep, expr, tex } from '@learning/core'
import { Root } from './Root'

export const Factor = createStep({
  name: 'math/algebra/factor',
  schema: {
    data: { expr: 'expr' },
    inputs: { attempt: 'expr' },
  },
  options: {
    video: 'https://youtube.com/embed/32u4Pr0-XDk',
  },
  prompt: (ctx) => @{
    <>
      <p>
        Factorise <strong>complètement</strong> l'expression suivante:
      </p>
      <Attempt>
        {tex`${ctx.data.expr} =`} {ctx.inputs.attempt}
      </Attempt>
    </>
  },
  grade: ({ inputs: { attempt }, data: { expr } }) => [attempt.isEqual(expr), attempt.isFactored()],
  feedback: (ctx) => @{
    @if (!ctx.correct) {
      <Root expr={ctx.data.expr}>
        {(rootCtx) => (
          <FactorFromRoot root={rootCtx.inputs.root}>
            <ctx.Self />
          </FactorFromRoot>
        )}
      </Root>
    }
  },
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
  feedback: (ctx) => @{
    @if (!ctx.correct) {
      function factor(subs?: boolean) {
        const expr = ctx.inputs.factor
        return subs ? expr.subs({ x: ctx.data.root }).simplify() : expr
      }
      <>
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
      </>
    }
  },
})
