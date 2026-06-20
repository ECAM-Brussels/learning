import { Loading, type ParentComponent } from 'solid-js'
import { CheckMark } from './CheckMark'

export const Attempt: ParentComponent<{
  correct?: (() => boolean | undefined) | boolean
}> = (props) => {
  return (
    <div class="flex items-center justify-center gap-2">
      {props.children}{' '}
      <Loading>
        <CheckMark value={typeof props.correct === 'function' ? props.correct() : props.correct} />
      </Loading>
    </div>
  )
}
