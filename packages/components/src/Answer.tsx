import { createMemo, type ParentComponent } from 'solid-js'
import CheckMark from './CheckMark'

type MaybeAsync<T> = T | Promise<T>

export const Answer: ParentComponent<{
  correct?: boolean | (() => MaybeAsync<boolean | undefined>)
}> = (props) => {
  const correctValue = createMemo(() =>
    typeof props.correct === 'function' ? props.correct() : props.correct,
  )
  return (
    <div class="flex items-center justify-center gap-2">
      {props.children} <CheckMark value={correctValue()} />
    </div>
  )
}
