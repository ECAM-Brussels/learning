import { Attempt } from '@learning/components'
import { createDerivedStep, createStep, expr, tex } from '@learning/core'
import { Simple } from '@learning/exercises/math/Simple'
import { Show } from 'solid-js'

export const Evaluation = createDerivedStep(Simple, { f: 'expr', a: 'expr' }, (data) => ({
  prompt: (
    <p>
      Calculez {tex`f(${data.a})`} pour {tex`f(x) = ${data.f}`}.
    </p>
  ),
  label: tex`f(${data.a}) =`,
  grade: (attempt) => data.f.subs({ x: data.a }).isEqual(attempt),
}))

export const Slope = createStep({
  schema: {
    data: { x1: 'number', y1: 'number', x2: 'number', y2: 'number' },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => (
    <>
      <p>
        Quelle est la pente de la droite qui passe par {tex`(${ctx.data.x1}, ${ctx.data.y1})`} et{' '}
        {tex`(${ctx.data.x2}, ${ctx.data.y2})`} ?
      </p>
      <Attempt>
        {tex`m =`} {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  grade: (ctx) =>
    ctx.inputs.attempt.isEqual(
      expr('\\frac{a}{b}').subs({ a: ctx.data.y2 - ctx.data.y1, b: ctx.data.x2 - ctx.data.x1 }),
    ),
  feedback: (ctx) => (
    <Show when={!ctx.correct}>
      <p>
        La pente est le quotient{' '}
        {tex`\frac{\Delta y}{\Delta x} = \frac{${ctx.data.y2} - ${ctx.data.y1}}{${ctx.data.x2} - ${ctx.data.x1}}`}
        . Essayez à nouveau :
      </p>
      <ctx.Self />
    </Show>
  ),
})
