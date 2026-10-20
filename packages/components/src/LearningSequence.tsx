import { type JSX } from '@solidjs/web'
import {
  children,
  createContext,
  createEffect,
  createSignal,
  Repeat,
  Show,
  useContext,
} from 'solid-js'
import { Scope } from './Scope'

const ProgressContext = createContext<() => void>()

export function LearningSequence(props: { children: JSX.Element[] }) {
  const [step, setStep] = createSignal(0)
  const advance = () => setStep((prev) => prev + 1)
  return (
    <ProgressContext value={advance}>
      <Scope>
        {() => {
          const resolved = children(() => props.children)
          return (
            <Repeat count={resolved.toArray().length}>
              {(i) => <Show when={i <= step()}>{resolved.toArray()[i]}</Show>}
            </Repeat>
          )
        }}
      </Scope>
    </ProgressContext>
  )
}

export function CheckPoint(
  props:
    | {
        passed?: boolean | (() => boolean | Promise<boolean>)
      }
    | {
        children?: ((advance: () => void) => JSX.Element) | JSX.Element
      },
) {
  const ctx = useContext(ProgressContext)
  const [passed, setPassed] = createSignal(async () => {
    if (!('passed' in props)) return false
    if (typeof props.passed === 'function') return props.passed()
    return props.passed ?? false
  })
  createEffect(passed, (passed, prev) => {
    if (passed && !prev) ctx?.()
  })
  return 'children' in props && props.children ? (
    typeof props.children === 'function' ? (
      props.children?.(() => setPassed(true))
    ) : (
      <Show when={passed()}>{props.children}</Show>
    )
  ) : (
    <button
      class="mx-auto mt-4 block rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={() => setPassed(true)}
      disabled={passed()}
    >
      Continuer à lire ↓
    </button>
  )
}
