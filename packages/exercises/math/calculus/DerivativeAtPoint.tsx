import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { Show } from 'solid-js'
import { Simple } from '../Simple'
import { Derivative } from './Derivative'

export const DerivativeAtPoint = createStep({
  schema: { data: { f: 'expr', x: 'expr' }, inputs: { attempt: 'expr' } },
  prompt: (ctx) => (
    <>
      <p>
        Calculez la dérivée de {tex`${ctx.data.f}`} en {tex`x = ${ctx.data.x}`}
      </p>
      <Attempt>
        {tex`
          \frac{\mathrm d}{\mathrm d x}
          \left. ${ctx.data.f} \right|_{x = ${ctx.data.x}} =
        `}{' '}
        {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  grade: (ctx) => ctx.data.f.diff('x', ctx.data.x).isEqual(ctx.inputs.attempt),
  feedback: (ctx) => (
    <Show when={!ctx.correct}>
      <Derivative f={ctx.data.f}>
        {(derivativeCtx) => (
          <>
            <Simple
              prompt={
                <p>
                  Maintenant, évaluez {tex`${derivativeCtx.inputs.attempt}`} en{' '}
                  {tex`x = ${ctx.data.x}`}
                </p>
              }
              grade={(attempt) =>
                derivativeCtx.inputs.attempt.subs({ x: ctx.data.x }).isEqual(attempt)
              }
            />
          </>
        )}
      </Derivative>
    </Show>
  ),
})
