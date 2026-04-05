import Latex from '@learning/components/Latex'
import { createMemo, Show } from 'solid-js'
import * as v from 'valibot'
import { defineField } from './exercise/base'
import { expr } from './expr'

export function Math(label: string) {
  const base = v.pipe(
    v.string(),
    v.nonEmpty(),
    v.check((v) => {
      try {
        expr(v)
        return true
      } catch (error) {
        return false
      }
    }, 'Expression mathématique invalide'),
  )
  return defineField({
    label,
    base,
    feedback: v.pipe(v.string(), v.transform(expr)),
    Component: function (props) {
      const valid = createMemo(() => v.safeParse(base, props.state[props.name]).success)
      return (
        <>
          <Show
            when={!props.question}
            fallback={
              <span title={props.label}>
                <Show when={props.value}>
                  <Latex value={props.value!} />
                </Show>
              </span>
            }
          >
            <input
              class={[
                'rounded border p-2 outline-none',
                {
                  'bg-slate-50': props.readOnly === true,
                  'border-red-200': !valid(),
                  'border-green-500': valid(),
                },
              ]}
              placeholder={props.label}
              title={props.label}
              value={props.state.value?.rawInput ?? props.value?.rawInput ?? ''}
              readonly={props.question || props.readOnly}
              onInput={(event) => {
                if (!props.question) {
                  props.setState((s) => {
                    s[props.name] = event.target.value
                  })
                }
              }}
            />
          </Show>
        </>
      )
    },
  })
}
