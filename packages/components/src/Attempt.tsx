import { createMemo, isPending, Loading, useContext, type ParentComponent } from 'solid-js'
import { CheckMark } from './CheckMark'
import { FeedbackContext } from './FeedbackContext'

/**
 * The line where a student answers in a step's prompt: its fields, then a check mark once graded.
 * `correct` sets the mark yourself, for a custom field.
 *
 * @example
 * prompt: (ctx) => (
 *   <>
 *     <p>Calculez la dérivée de {tex`${ctx.data.f}`}.</p>
 *     <Attempt>{tex`f'(x) =`} {ctx.inputs.attempt}</Attempt>
 *   </>
 * )
 */
export const Attempt: ParentComponent<{
  class?: string
  /** Whether the answer is right, shown as a check mark: the step's grade by default. */
  correct?: boolean
}> = (props) => {
  const context = useContext(FeedbackContext)
  const value = createMemo(() => props.correct ?? context?.correct)
  const grading = createMemo(() => value() === undefined && isPending(value))
  return (
    <div class={['flex items-center justify-center gap-2', props.class]}>
      {props.children}{' '}
      <Loading>
        <CheckMark value={value()} />
        {grading() && '...'}
      </Loading>
    </div>
  )
}
