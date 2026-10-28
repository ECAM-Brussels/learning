import { Attempt } from '@learning/components'
import { createStep, schemas, tex, type Expression } from '@learning/core'
import { Show } from 'solid-js'
import * as v from 'valibot'

export const Simple = createStep({
  schema: {
    data: {
      prompt: 'jsx',
      label: v.optional(schemas.jsx),
      tex: v.optional(v.boolean()),
      grade: v.custom<(attempt: Expression<'output'>) => boolean | Promise<boolean>>(() => true),
    },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => {
    const isTex = () => {
      if (ctx.data.tex !== undefined) return ctx.data.tex
      return typeof ctx.data.label === 'string' && (ctx.data.label?.includes('=') ?? false)
    }
    return (
      <>
        <div>{ctx.data.prompt}</div>
        <Attempt>
          <Show
            when={isTex()}
            fallback={ctx.data.label ?? 'Réponse:'}
          >{tex`${ctx.data.label as string}`}</Show>
          {ctx.inputs.attempt}
        </Attempt>
      </>
    )
  },
  grade: (ctx) => ctx.data.grade(ctx.inputs.attempt),
})
