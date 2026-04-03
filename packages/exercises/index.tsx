import { Dynamic } from '@solidjs/web'
import { createMemo, lazy, type ComponentProps } from 'solid-js'

const components = {
  'math/factor': lazy(() => import('./math/factor/index')),
} as const

type MaybeAsync<T> = T | Promise<T>
type AnyExercise = Awaited<
  ReturnType<ComponentProps<(typeof components)[keyof typeof components]>['fetch']>
>
type Props = {
  fetch: () => MaybeAsync<AnyExercise>
  save: (exercise: AnyExercise) => any
}

export default function Exercise(props: Props) {
  const data = createMemo(props.fetch)
  return <Dynamic component={components[data()['name']]} {...(props as any)} />
}
