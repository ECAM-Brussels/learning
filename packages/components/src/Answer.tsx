import { type ParentComponent } from 'solid-js'
import { CheckMark } from './CheckMark'

export const Answer: ParentComponent<{
  correct?: boolean
}> = (props) => {
  return (
    <div class="flex items-center justify-center gap-2">
      {props.children} <CheckMark value={props.correct} />
    </div>
  )
}
