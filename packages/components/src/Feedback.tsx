import { createMemo, Show, useContext, type Component, type JSX } from 'solid-js'
import { StepContext } from './StepContext'

export const Feedback: Component<{
  children: JSX.Element | (() => JSX.Element)
  correct?: boolean
  when?: 'correct' | 'incorrect' | 'always'
}> = (props) => {
  const ctx = useContext(StepContext)
  const correct = createMemo(() => props.correct ?? ctx?.correct)
  const when = createMemo(() => {
    const conditions: Record<NonNullable<typeof props.when>, boolean> = {
      correct: correct() === true,
      incorrect: correct() === false,
      always: correct() !== undefined,
    }
    return conditions[props.when ?? 'incorrect']
  })
  return (
    <Show when={when()}>
      <details
        open
        class={[
          'm-4 rounded border-l-4 p-4 py-2 text-slate-600',
          {
            'border-green-900': correct() === true,
            'border-red-900': correct() === false,
          },
        ]}
      >
        <summary
          class={[
            'font-bold',
            {
              'text-green-900': correct() === true,
              'text-red-900': correct() === false,
            },
          ]}
        >
          Feedback
        </summary>
        {typeof props.children === 'function' ? props.children() : props.children}
      </details>
    </Show>
  )
}
