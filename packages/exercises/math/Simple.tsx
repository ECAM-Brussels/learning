import { Attempt } from '@learning/components'
import { createStep, tex, type Expression } from '@learning/core'
import { Show } from 'solid-js'
import * as v from 'valibot'

export const Simple = createStep({
  schema: {
    data: {
      prompt: 'jsx',
      label: v.optional(v.string()),
      tex: v.optional(v.boolean()),
      grade: v.custom<(attempt: Expression<'output'>) => boolean | Promise<boolean>>(
        (value) => true,
      ),
    },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => {
    const isTex = () => {
      if (ctx.data.tex !== undefined) return ctx.data.tex
      return ctx.data.label?.includes('=') ?? false
    }
    return (
      <>
        <div>{ctx.data.prompt}</div>
        <Attempt>
          <Show
            when={isTex()}
            fallback={ctx.data.label ?? 'Réponse:'}
          >{tex`${ctx.data.label}`}</Show>
          {ctx.inputs.attempt}
        </Attempt>
      </>
    )
  },
  grade: (ctx) => ctx.data.grade(ctx.inputs.attempt),
})
