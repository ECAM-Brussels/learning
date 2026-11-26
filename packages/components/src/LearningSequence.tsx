import { type JSX } from '@solidjs/web'
import {
  children,
  createContext,
  createEffect,
  createSignal,
  Loading,
  Repeat,
  Show,
  useContext,
} from 'solid-js'
import { Scope } from './Scope'

const ProgressContext = createContext<{ step: () => number; setStep: (step: number) => void }>()

export function LearningSequence(props: { children: JSX.Element[] }) {
  const [step, setStep] = createSignal(0)
  return (
    <ProgressContext value={{ step, setStep }}>
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

export function Steps(props: { children: JSX.Element[] }) {
  const [step, setStep] = createSignal(0)
  const increment = (inc: number) => () => document.startViewTransition(() => setStep(step() + inc))
  const resolved = children(() => props.children)
  return (
    <div class="not-prose mx-4 my-4 rounded-xl bg-white shadow-md">
      <h3 class="flex justify-center gap-4 rounded-t-xl bg-gray-100 px-4 py-1 text-sm font-bold text-gray-600">
        <button
          class="rounded px-4 enabled:cursor-pointer enabled:hover:bg-gray-200 disabled:text-gray-300"
          onClick={increment(-1)}
          disabled={step() === 0}
        >
          ←
        </button>
        <span>
          Étape {step() + 1}/{resolved.toArray().length}
        </span>
        <button
          class="rounded px-4 enabled:cursor-pointer enabled:hover:bg-gray-200 disabled:text-gray-300"
          onClick={increment(1)}
          disabled={step() === resolved.toArray().length - 1}
        >
          →
        </button>
      </h3>
      <div class="p-4">
        <Repeat count={resolved.toArray().length}>
          {(i) => <Show when={i === step()}>{resolved.toArray()[i]}</Show>}
        </Repeat>
      </div>
      <h3 class="flex justify-center gap-4 rounded-b-xl bg-gray-100 px-4 py-1 text-sm font-bold text-gray-600">
        <button
          class="rounded px-4 enabled:cursor-pointer enabled:hover:bg-gray-200 disabled:text-gray-300"
          onClick={increment(-1)}
          disabled={step() === 0}
        >
          ←
        </button>
        <span>
          Étape {step() + 1}/{resolved.toArray().length}
        </span>
        <button
          class="rounded px-4 enabled:cursor-pointer enabled:hover:bg-gray-200 disabled:text-gray-300"
          onClick={increment(1)}
          disabled={step() === resolved.toArray().length - 1}
        >
          →
        </button>
      </h3>
    </div>
  )
}

export function CheckPoint(props: {
  /** Moves on by itself once true; without it, a button lets the reader move on. */
  passed?: boolean | (() => boolean | Promise<boolean>)
  /** Shown once passed; a function renders its own way to move on instead. */
  children?: ((advance: () => void) => JSX.Element) | JSX.Element
}) {
  const ctx = useContext(ProgressContext)
  const [passed, setPassed] = createSignal(async () => {
    if (typeof props.passed === 'function') return props.passed()
    return props.passed ?? false
  })
  createEffect(passed, (passed, prev) => {
    if (passed && !prev) document.startViewTransition(() => ctx?.setStep(ctx.step() + 1))
  })
  if (typeof props.children === 'function') return props.children(() => setPassed(true))
  // Its own boundary: while the condition is pending, the parts before it stay on screen.
  return (
    <Loading>
      <Show when={props.passed === undefined}>
        <button
          class="mx-auto mt-4 block rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setPassed(true)}
          disabled={passed()}
        >
          Continuer à lire ↓
        </button>
      </Show>
      <Show when={passed()}>{props.children as JSX.Element}</Show>
    </Loading>
  )
}
