import { createEffect, createSignal, Repeat, type JSX } from 'solid-js'

export function Pagination(props: {
  current?: number
  children: (() => JSX.Element)[]
  onChange?: (page: number) => void
}) {
  const [current, setCurrent] = createSignal(() => props.current ?? 1)
  createEffect(current, () => {
    if (current() !== props.current) {
      props.onChange?.(current())
    }
  })
  return (
    <>
      <div class="flex justify-center">
        <button
          class="cursor-pointer px-2 py-1"
          onClick={() => setCurrent((prev) => Math.max(prev - 1, 1))}
        >
          ‹
        </button>
        <Repeat count={props.children.length}>
          {(i) => (
            <button
              class={[
                'cursor-pointer rounded px-2 py-1',
                {
                  'bg-sky-700 text-sky-50': current() === i + 1,
                  'text-gray-400': current() !== i + 1,
                },
              ]}
              onClick={() => setCurrent(i + 1)}
            >
              {i + 1}
            </button>
          )}
        </Repeat>
        <button
          class="cursor-pointer px-2 py-1 text-gray-400"
          onClick={() => setCurrent((prev) => Math.min(prev + 1, props.children.length))}
        >
          ›
        </button>
      </div>
      {props.children[current() - 1]?.()}
    </>
  )
}

export default Pagination
