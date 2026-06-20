import { createMemo, Loading, useContext, type Component, type JSX } from 'solid-js'
import { FeedbackContext } from './FeedbackContext'

export const Feedback: Component<{
  children: JSX.Element
  correct?: (() => boolean | undefined) | boolean
}> = (props) => {
  const context = useContext(FeedbackContext)
  const correct = createMemo(
    () =>
      (typeof props.correct === 'function' ? props.correct() : props.correct) ?? context?.correct,
  )
  return (
    <Loading fallback={<p>Chargement du feedback...</p>}>
      <details
        open
        class={[
          'm-4 rounded border border-l-4 border-gray-50 p-4 py-2 text-slate-600 shadow',
          {
            'border-l-green-900': correct() === true,
            'border-l-red-900': correct() === false,
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
        {props.children}
      </details>
    </Loading>
  )
}
