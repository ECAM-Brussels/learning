import { createMemo, createSignal, Show } from 'solid-js'

export function Counter() {
  const [count, setCount] = createSignal(0)
  return (
    <button
      class="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
      onClick={() => setCount(count() + 1)}
    >
      Cliqué {count()} fois
    </button>
  )
}

export function Square() {
  const [n, setN] = createSignal(3)
  const square = createMemo(() => n() * n())
  return (
    <div>
      <input
        type="number"
        class="w-20 rounded border px-2"
        value={n()}
        onInput={(e) => setN(Number(e.currentTarget.value))}
      />
      <p>
        {n()} a pour carré {square()}.
      </p>
      <Show when={n() % 2 === 0} fallback={<p>{n()} est impair.</p>}>
        <p>{n()} est pair.</p>
      </Show>
    </div>
  )
}
