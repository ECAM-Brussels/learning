import { Attempt } from '@learning/components'
import { createStep, expr, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'

const PolarForm = createStep({
  schema: { data: { complex: 'expr' }, inputs: { r: 'expr', theta: 'expr' } },
  prompt: (ctx) => (
    <>
      <p>Exprimez le nombre complexe {tex`${ctx.data.complex}`} en forme polaire</p>

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
      correctR: ctx.data.complex.abs().isEqual(ctx.inputs.r),
      correctTheta: ctx.data.complex.arg().isEqual(ctx.inputs.theta),
      wrongQuadrant1: ctx.data.complex
        .arg()
        .isEqual(expr('\\pi + t').subs({ t: ctx.inputs.theta })),
      wrongQuadrant2: ctx.data.complex
        .arg()
        .isEqual(expr('t - \\pi').subs({ t: ctx.inputs.theta })),
    })
    return [checks.correctR && checks.correctTheta, checks]
  },
  feedback: (ctx) => <></>,
})

export default function Page() {
  return (
    <>
      Contenu...
      <PolarForm id="hello" complex="1 + \imaginaryI" />
    </>
  )
}
