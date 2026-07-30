import { Dynamic, type JSX } from '@solidjs/web'
import { createEffect, createSignal, For } from 'solid-js'

export function Pagination(props: {
  current?: number
  children: (() => JSX.Element)[]
  onChange?: (page: number) => void
  progress?: (boolean | null | undefined)[]
}) {
  const [current, setCurrent] = createSignal(() => props.current ?? 1)
  createEffect(current, (current) => {
    if (props.current !== current) {
      props.onChange?.(current)
    }
  })
  return (
    <div class="rounded-xl border border-gray-200 p-4 py-8 shadow-xs">
      <div class="flex justify-center">
        <button
          class="cursor-pointer px-3 py-1 text-gray-400 shadow"
          onClick={() => setCurrent((prev) => Math.max(prev - 1, 1))}
        >
          ‹
        </button>
        <For each={Array.from(Array(props.children.length).keys())}>
          {(i) => (
            <button
              class={[
                'cursor-pointer border-gray-50 px-3 py-1 shadow',
                {
                  'border border-sky-700 font-bold text-sky-700': current() === i + 1,
                  'text-gray-400': current() !== i + 1,
                  'bg-green-100': props.progress?.[i] === true,
                  'bg-red-100': props.progress?.[i] === false,
                },
              ]}
              onClick={() => setCurrent(i + 1)}
            >
              {i + 1}
            </button>
          )}
        </For>
        <button
          class="cursor-pointer px-3 py-1 text-gray-400 shadow"
          onClick={() => setCurrent((prev) => Math.min(prev + 1, props.children.length))}
        >
          ›
        </button>
      </div>
      <Dynamic component={props.children[current() - 1]} />
    </div>
  )
}

export default Pagination
