import { Loading, useContext, type ParentComponent } from 'solid-js'
import { CheckMark } from './CheckMark'
import { FeedbackContext } from './FeedbackContext'

export const Attempt: ParentComponent<{
  correct?: boolean
}> = (props) => {
  const context = useContext(FeedbackContext)
  return (
    <div class="flex items-center justify-center gap-2">
      {props.children}{' '}
      <Loading>
        <CheckMark value={props.correct ?? context?.correct} />
      </Loading>
    </div>
  )
}
