import { MDXProvider } from '@learning/mdx'
import { useBeforeLeave } from '@solidjs/router'
import type { JSX } from '@solidjs/web'
import {
  createContext,
  createMemo,
  createStore,
  For,
  Loading,
  type ParentComponent,
  type StoreSetter,
} from 'solid-js'
import { Heading } from './Heading'

type Node = {
  title: JSX.Element
  visible: boolean
  position: number
  level: 1 | 2 | 3 | 4 | 5 | 6
}

export const TOCContext = createContext<StoreSetter<Node[]>>()

export const Page: ParentComponent<{ title?: JSX.Element }> = (props) => {
  const active = createMemo(() => {
    let index = toc.map((n) => n.visible).findIndex((v) => v)
    if (index === -1) {
      index = toc.map((n) => n.position).findIndex((p) => p > 0) - 1
    }
    return index
  })

  useBeforeLeave((event) => {
    if (typeof event.to === 'string') {
      const url = new URL(event.to, 'http://localhost').pathname
      if (url !== event.from.pathname) setToc((s) => [])
    }
  })

  const [toc, setToc] = createStore<Node[]>([])

  return (
    <Loading>
      <div class="relative container mx-auto flex w-screen pb-1">
        <main class="prose prose-code:before:content-none prose-code:after:content-none max-w-270 grow overflow-auto scroll-smooth rounded-b-xl bg-white p-8 pb-200 shadow-sm">
          <MDXProvider
            components={{
              h1: (props) => <Heading level={1}>{props.children}</Heading>,
              h2: (props) => <Heading level={2}>{props.children}</Heading>,
              h3: (props) => <Heading level={3}>{props.children}</Heading>,
              h4: (props) => <Heading level={4}>{props.children}</Heading>,
            }}
          >
            <TOCContext value={setToc}>{props.children}</TOCContext>
          </MDXProvider>
        </main>
        <aside class="sticky top-0 max-h-screen max-w-96 overflow-y-auto p-4 text-slate-600 print:hidden">
          <h1 class="my-4 text-2xl font-bold">Table des matières</h1>
          <For each={toc}>
            {(node, i) => (
              <a
                replace
                href={`#${i()}`}
                class={[
                  'font-lg block border-l-4 py-2',
                  {
                    'pl-2': node.level === 1,
                    'pl-4': node.level === 2,
                    'pl-6': node.level === 3,
                    'border-sky-600 bg-blue-50': active() === i(),
                    'border-transparent hover:border-slate-300 hover:bg-slate-50': active() !== i(),
                  },
                ]}
              >
                {node.title}
              </a>
            )}
          </For>
        </aside>
      </div>
    </Loading>
  )
}
