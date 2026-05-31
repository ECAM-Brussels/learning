import { createContext, createStore, For, type JSX, Loading, Show, useContext } from 'solid-js'

type Node = {
  title: JSX.Element
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
        <div class="flex max-h-screen w-screen justify-center overflow-hidden print:max-h-none">
          <main class="prose container max-w-270 overflow-auto scroll-smooth p-8">
            <Show when={props.title}>
              <h1 class="text-center text-5xl font-bold text-cyan-900">{props.title}</h1>
            </Show>
            {props.children}
          </main>
          <aside class="max-w-96 p-4 shadow print:hidden">
            <h1 class="my-4 text-2xl font-bold">Table des matières</h1>
            <For each={store[0]}>
              {(node, i) => (
                <a href={`#${i()}`} class={['font-lg my-2 block', { 'ml-2': node().level === 2 }]}>
                  {node().title}
                </a>
              )}
            </For>
          </aside>
        </div>
      </TableOfContents>
    </Loading>
  )
}
