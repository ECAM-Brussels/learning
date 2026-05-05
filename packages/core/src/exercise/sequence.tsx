import { Repeat, type JSX } from 'solid-js'
import { ExerciseContext } from './base'

type Props = {
  id?: string
  children: JSX.Element[]
}

export function ExerciseSequence(props: Props) {
  const key = (i: number) =>
    `sequence:${window.location.pathname}:${window.location.search}:${props.id ?? ''}:${i}`
  return (
    <Repeat count={props.children.length}>
      {(i) => {
        return (
          <ExerciseContext
            value={{
              fetch: () => {
                return JSON.parse(localStorage.getItem(key(i)) ?? 'null')
              },
              save: (_id, exercise) => {
                localStorage.setItem(key(i), JSON.stringify(exercise))
              },
            }}
          >
            {props.children[i]}
          </ExerciseContext>
        )
      }}
    </Repeat>
  )
}
