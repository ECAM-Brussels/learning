import { CheckMark } from '@learning/components'
import { createStepComponent, Step } from '@learning/core'
import type { JSX } from '@solidjs/web'
import { For, Loading } from 'solid-js'
import * as v from 'valibot'

type MaybeAsync<T> = T | Promise<T>

const InternalMultipleChoice = createStepComponent(
  {
    choices: v.record(
      v.string(),
      v.custom<JSX.Element>(() => true),
    ),
    prompt: v.custom<JSX.Element>(() => true),
    correct: v.custom<(selection: string[]) => MaybeAsync<boolean>>(() => true),
    children: v.optional(
      v.custom<(feedback: { correct: boolean; selection: string[] }) => JSX.Element>(() => true),
    ),
  },
  (props) => (
    <Step
      id={props.id}
      inputs={{ selection: v.array(v.string()) }}
      feedback={(inputs) => ({
        correct: props.correct(inputs.selection),
        selection: inputs.selection,
      })}
      prompt={(ctx) => (
        <>
          {props.prompt}
          <div class="my-4 flex items-center gap-2">
            <For each={Object.entries(props.choices).filter(([key]) => key !== 'toJSON')}>
              {(entry) => (
                <label class="block rounded border border-gray-200 px-4 py-2 shadow">
                  <input
                    class="mr-2"
                    type="checkbox"
                    checked={ctx.state.selection?.includes(entry[0])}
                    disabled={ctx.savedState !== undefined}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked
                      ctx.setState('selection', (prev) => {
                        prev = prev?.filter((v) => v !== entry[0]) ?? []
                        if (checked) prev.push(entry[0])
                        return prev
                      })
                    }}
                  />{' '}
                  {entry[1]}
                </label>
              )}
            </For>
            <Loading>
              <CheckMark value={ctx.feedback?.correct} />
            </Loading>
          </div>
        </>
      )}
    >
      {props.children}
    </Step>
  ),
)

export function MultipleChoice<K extends string>(props: {
  id?: string
  choices: Record<K, JSX.Element>
  prompt: JSX.Element
  correct: (selection: K[]) => MaybeAsync<boolean>
  children?: (selection: K[]) => JSX.Element
}) {
  return <InternalMultipleChoice {...(props as any)} />
}
