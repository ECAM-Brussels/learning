import type { JSX } from '@solidjs/web'
import {
  type ParentComponent,
  createContext,
  createMemo,
  createStore,
  For,
  Loading,
  Show,
  useContext,
} from 'solid-js'

type Node = {
  title: JSX.Element
  visible: boolean
  position: number
  level: 1 | 2 | 3 | 4 | 5 | 6
}

type TOC = ReturnType<typeof createStore<Node[]>>

export const TableOfContents = createContext<TOC>()

export const useTableOfContents = () => useContext(TableOfContents)

export const Page: ParentComponent<{ title?: JSX.Element }> = (props) => {
  const [store, setStore] = createStore<Node[]>([])
  const active = createMemo(() => {
    let index = store.map((n) => n.visible).findIndex((v) => v)
    if (index === -1) {
      index = store.map((n) => n.position).findIndex((p) => p > 0) - 1
    }
    return index
  })

  return (
    <Loading>
      <TableOfContents value={[store, setStore] as TOC}>
        <div class="flex max-h-screen w-screen justify-center overflow-hidden print:max-h-none">
          <main class="prose container max-w-270 overflow-auto scroll-smooth bg-white p-8 pb-200 shadow-md">
            <Show when={props.title}>
              <h1 class="text-center text-5xl font-bold text-cyan-900">{props.title}</h1>
            </Show>
            {props.children}
          </main>
          <aside class="max-h-screen max-w-96 overflow-y-auto bg-slate-50 p-4 text-slate-600 shadow print:hidden">
            <h1 class="my-4 text-2xl font-bold">Table des matières</h1>
            <For each={store}>
              {(node, i) => (
                <a
                  href={`#${i()}`}
                  class={[
                    'font-lg block border-l-4 py-2',
                    {
                      'pl-2': node.level === 1,
                      'pl-4': node.level === 2,
                      'pl-6': node.level === 3,
                      'border-sky-600 bg-blue-50': active() === i(),
                      'border-transparent hover:border-slate-300 hover:bg-slate-50':
                        active() !== i(),
                    },
                  ]}
                >
                  {node.title}
                </a>
              )}
            </For>
          </aside>
        </div>
      </TableOfContents>
    </Loading>
  )
}
