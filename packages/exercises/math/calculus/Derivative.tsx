import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'

export const Derivative = createStep({
  schema: { data: { f: 'expr' }, inputs: { attempt: 'expr' } },
  prompt: (ctx) => (
    <>
      <p>Calculez la dérivée de {tex`${ctx.data.f}`}</p>
      <Attempt>
        {tex`
          \frac{\mathrm d}{\mathrm d x}
          \left.${ctx.data.f} \right| =
        `}{' '}
        {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  grade: (ctx) => ctx.data.f.diff().isEqual(ctx.inputs.attempt),
})
