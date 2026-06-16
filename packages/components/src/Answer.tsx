import { type ParentComponent } from 'solid-js'
import { CheckMark } from './CheckMark'

type MaybeAsync<T> = T | Promise<T>

export const Answer: ParentComponent<{
  correct?: boolean
}> = (props) => {
  return (
    <div class="flex items-center justify-center gap-2">
      {props.children} <CheckMark value={props.correct} />
    </div>
  )
}
