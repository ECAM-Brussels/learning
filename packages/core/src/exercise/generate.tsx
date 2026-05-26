import { Dynamic } from '@solidjs/web'
import { createMemo, Loading, type Component } from 'solid-js'

export function Generate<T extends object & { id?: string }>(props: {
  id?: string
  exercise: Component<T>
  data: () => T | Promise<T>
}) {
  const exerciseProps = createMemo(props.data)
  return (
    <Loading fallback={<p>Génération de l'exercice...</p>}>
      <Dynamic component={props.exercise} id={props.id} {...exerciseProps()} />
    </Loading>
  )
}
