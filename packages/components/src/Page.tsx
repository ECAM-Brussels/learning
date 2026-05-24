import { createContext, createStore, For, type JSX, Loading, Show, useContext } from 'solid-js'

type Node = {
  title: string
  level: 1 | 2 | 3 | 4 | 5 | 6
}

type TOC = ReturnType<typeof createStore<Node[]>>

export const TableOfContents = createContext<TOC>()

export const useTableOfContents = () => useContext(TableOfContents)

export function Page(props: { title?: JSX.Element; children: JSX.Element }) {
  const store = createStore<Node[]>([])
  return (
    <Loading>
      <TableOfContents value={store as TOC}>
        <div class="flex max-h-screen w-screen justify-center overflow-hidden">
          <main class="prose container max-w-270 overflow-auto p-8">
            <Show when={props.title}>
              <h1 class="text-center text-5xl font-bold text-cyan-900">{props.title}</h1>
            </Show>
            {props.children}
          </main>
          <aside class="max-w-96 p-4 shadow">
            <h1 class="my-4 text-2xl font-bold">Table des matières</h1>
            <For each={store[0]}>
              {(node) => (
                <p class={['font-lg my-2', { 'ml-2': node().level === 2 }]}>{node().title}</p>
              )}
            </For>
          </aside>
        </div>
      </TableOfContents>
    </Loading>
  )
}
