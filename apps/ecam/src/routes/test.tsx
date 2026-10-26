import { Attempt } from '@learning/components'
import { createStep, expr, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'
import { createMemo, Match, Switch } from 'solid-js'

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
    })
    return checks.correctR && checks.correctTheta
  },
  feedback: (ctx) => {
    const correctR = createMemo(() => ctx.data.expr.abs().isEqual(ctx.inputs.r))
    const correctTheta = createMemo(() => ctx.data.expr.arg().isEqual(ctx.inputs.theta))
    const wrongQuadrant = createMemo(() =>
      expr('\\tan(x) = \\tan(y)').subs({ x: ctx.data.expr.arg(), y: ctx.inputs.theta }).isTrue(),
    )
    return (
      <Switch>
        <Match when={!correctR()}>
          <DefinitionModule expr={ctx.data.expr}>
            <CorrectModule expr={ctx.data.expr}>
              <ctx.Self />
            </CorrectModule>
          </DefinitionModule>
        </Match>
        <Match when={correctR() && !correctTheta()}>
          <p>Argument incorrect</p>
        </Match>
        <Match when={!correctTheta() && wrongQuadrant()}>
          <p>Quadrant incorrect</p>
        </Match>
      </Switch>
    )
  },
})

const DefinitionModule = createStep({
  schema: { data: { expr: 'expr' }, inputs: { r: 'expr' } },
  prompt: (ctx) => (
    <>
      <p>Quelle est être la formule pour calculer le module {tex`r`} ?</p>
      <Attempt>
        {tex`r = `}
        {ctx.inputs.r}
      </Attempt>
    </>
  ),
  grade: async (ctx) => {
    const checks = await allKeyed({
      correctR: ctx.inputs.r.isEqual(expr('\\sqrt{a^2 + b^2}')),
    })
    return [checks.correctR, checks]
  },
  feedback: (ctx) => <div></div>,
})

const CorrectModule = createStep({
  schema: { data: { expr: 'expr' }, inputs: { r: 'expr' } },
  prompt: (ctx) => (
    <div>
      <p>
        Quelle est le module {tex`r`} de l'expression {tex`${ctx.data.expr}`} ?
      </p>
      <Attempt>
        {tex`r = `}
        {ctx.inputs.r}
      </Attempt>
    </div>
  ),
  grade: async (ctx) => {
    const checks = await allKeyed({
      correctR: ctx.inputs.r.isEqual(ctx.data.expr.abs()),
    })
    return [checks.correctR, checks]
  },
  feedback: (ctx) => {
    return (
      <>
        {tex`
          \begin{align*}
          r &= ${expr('\\sqrt{a^2 + b^2}').subs({ a: ctx.data.expr.real().simplify(), b: ctx.data.expr.imaginary() })} \\
            &= ${expr('\\sqrt{a^2 + b^2}').subs({ a: ctx.data.expr.real().simplify(), b: ctx.data.expr.imaginary() }).simplify()}
          \end{align*}
      `}
      </>
    )
  },
})

export default function Page() {
  return (
    <>
      Coordonnées polaires
      <PolarForm id="hello" expr="1 + \imaginaryI" />
    </>
  )
}
