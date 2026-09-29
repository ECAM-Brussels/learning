import { createMemo, isPending, Loading, useContext, type ParentComponent } from 'solid-js'
import { CheckMark } from './CheckMark'
import { FeedbackContext } from './FeedbackContext'

export const Attempt: ParentComponent<{
  correct?: boolean
}> = (props) => {
  const context = useContext(FeedbackContext)
  const value = createMemo(() => props.correct ?? context?.correct)
  const grading = createMemo(() => value() === undefined && isPending(value))
  return (
    <div class="flex items-center justify-center gap-2">
      {props.children}{' '}
      <Loading>
        <CheckMark value={value()} />
        {grading() && '...'}
      </Loading>
    </div>
  )
}
