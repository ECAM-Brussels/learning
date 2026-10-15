import { Attempt } from '@learning/components'
import { createStep, expr, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'

const PolarForm = createStep({
  schema: { data: { expr: 'expr' }, inputs: { r: 'expr', theta: 'expr' } },
  prompt: (ctx) => (
    <>
      <p>Exprimez le nombre complexe {tex`${ctx.data.expr}`} en forme polaire</p>
      <Attempt>
        {tex`r = `}
        {ctx.inputs.r}
        {tex`, \theta = `}
        {ctx.inputs.theta}
      </Attempt>
    </>
  ),
  grade: async (ctx) => {
    const checks = await allKeyed({
      correctR: ctx.data.expr.abs().isEqual(ctx.inputs.r),
      correctTheta: ctx.data.expr.arg().isEqual(ctx.inputs.theta),
      wrongQuadrant1: ctx.data.expr.arg().isEqual(expr('\\pi + t').subs({ t: ctx.inputs.theta })),
      wrongQuadrant2: ctx.data.expr.arg().isEqual(expr('t - \\pi').subs({ t: ctx.inputs.theta })),
    })
    return [checks.correctR && checks.correctTheta, checks]
  },
  feedback: (ctx) => <></>,
})

export default function Page() {
  return (
    <>
      Contenu...
      <PolarForm id="hello" expr="1 + \imaginaryI" />
    </>
  )
}
