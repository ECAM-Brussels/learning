import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { Show } from 'solid-js'

export const Root = createStep({
  name: 'math/algebra/root',
  schema: {
    data: { expr: 'expr' },
    inputs: { root: 'expr' },
  },
  correct: (ctx) => ctx.data.expr.checkRoot(ctx.inputs.root),
  prompt: (ctx) => (
    <>
      <p>Trouvez une racine de {tex`${ctx.data.expr}`}</p>
      <Attempt>
        {tex`x =`} {ctx.inputs.root}
      </Attempt>
    </>
  ),
  feedback: (root) => (
    <Show when={!root.correct} fallback={root.next}>
      <root.Self />
    </Show>
  ),
})
