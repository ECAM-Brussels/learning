import { Repeat, type JSX } from 'solid-js'
import { ExerciseContext } from './base'

type Props = {
  id?: string
  children: JSX.Element[]
}

export function ExerciseSequence(props: Props) {
  const id = () => `${window.location.pathname},${window.location.search},${props.id}`
  return (
    <Repeat count={props.children.length}>
      {(i) => {
        return (
          <ExerciseContext
            value={{
              fetch: (initialData) => {
                const stored = JSON.parse(localStorage.getItem(id()) ?? '[]')
                return stored.at(i) ?? initialData
              },
              save: (_initialData, exercise) => {
                const stored = JSON.parse(localStorage.getItem(id()) ?? '[]')
                stored[i] = exercise
                localStorage.setItem(id(), JSON.stringify(stored))
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
