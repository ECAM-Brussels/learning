import { MDXProvider } from '@learning/mdx'
import type { JSX } from '@solidjs/web'
import {
  createContext,
  createMemo,
  createSignal,
  For,
  onSettled,
  type Accessor,
  type ParentComponent,
} from 'solid-js'
import { Boundary } from './Boundary'
import { Heading } from './Heading'

export type TOCEntry = {
  title: () => JSX.Element
  level: 1 | 2 | 3 | 4 | 5 | 6
  element: HTMLElement
}

export const TOCContext = createContext<{
  entries: Accessor<TOCEntry[]>
  register: (entry: TOCEntry) => () => void
} | null>(null)

const byDocumentOrder = (a: TOCEntry, b: TOCEntry) =>
  a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1

export const Page: ParentComponent<{ title?: JSX.Element }> = (props) => {
  const [entries, setEntries] = createSignal<TOCEntry[]>([], { name: 'toc-entries' })
  const toc = createMemo(() => entries().filter((entry) => entry.level <= 3), { name: 'toc' })

  const [scrolled, setScrolled] = createSignal(0, { name: 'toc-scrolled' })
  const active = createMemo(
    () => {
      scrolled()
      const index = toc().findLastIndex((entry) => entry.element.getBoundingClientRect().top <= 100)
      return Math.max(index, 0)
    },
    { name: 'toc-active' },
  )
  onSettled(() => {
    const onScroll = () => setScrolled((n) => n + 1)
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  })

  const context = {
    entries: toc,
    register: (entry: TOCEntry) => {
      setEntries((entries) => [...entries, entry].sort(byDocumentOrder))
      return () => setEntries((entries) => entries.filter((e) => e !== entry))
    },
  }

  return (
    <div class="relative container mx-auto w-screen pb-1 xl:flex">
      <main class="prose prose-code:before:content-none prose-code:after:content-none max-w-270 grow overflow-auto scroll-smooth rounded-b-xl bg-white p-8 pb-200 shadow-sm">
        <MDXProvider
          components={{
            h1: (attrs) => <Heading level={1}>{attrs.children}</Heading>,
            h2: (attrs) => <Heading level={2}>{attrs.children}</Heading>,
            h3: (attrs) => <Heading level={3}>{attrs.children}</Heading>,
            h4: (attrs) => <Heading level={4}>{attrs.children}</Heading>,
          }}
        >
          <TOCContext value={context}>
            <Boundary fallback="Chargement de la page...">{props.children}</Boundary>
          </TOCContext>
        </MDXProvider>
      </main>
      <aside class="sticky top-0 max-h-screen max-w-96 overflow-y-auto p-4 text-slate-600 print:hidden">
        <h1 class="my-4 text-2xl font-bold">Table des matières</h1>
        <For each={toc()}>
          {(entry, i) => (
            <a
              replace
              href={`#${i()}`}
              class={[
                'font-lg block border-l-4 py-2',
                {
                  'pl-2': entry.level === 1,
                  'pl-4': entry.level === 2,
                  'pl-6': entry.level === 3,
                  'border-sky-600 bg-blue-50': active() === i(),
                  'border-transparent hover:border-slate-300 hover:bg-slate-50': active() !== i(),
                },
              ]}
            >
              {entry.title()}
            </a>
          )}
        </For>
      </aside>
    </div>
  )
}
