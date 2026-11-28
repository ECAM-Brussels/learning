import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { MDXProvider } from '@learning/mdx'
import type { JSX } from '@solidjs/web'
import {
  createContext,
  createMemo,
  createSignal,
  For,
  onSettled,
  Show,
  type Accessor,
  type ParentComponent,
} from 'solid-js'
import { Boundary } from './Boundary'
import { Fa } from './Fa'
import { Heading } from './Heading'
import { useLang, type Lang } from './Meta'

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

const labels = {
  fr: {
    show: 'Afficher la table des matières',
    hide: 'Masquer la table des matières',
    contents: 'Table des matières',
    loading: 'Chargement de la page...',
  },
  en: {
    show: 'Show the table of contents',
    hide: 'Hide the table of contents',
    contents: 'Contents',
    loading: 'Loading the page...',
  },
} satisfies Record<Lang, Record<string, string>>

/** `lang` is for a layout, where the page sits outside the course's `Meta`. */
export const Page: ParentComponent<{ title?: JSX.Element; lang?: Lang }> = (props) => {
  const parentLang = useLang()
  const label = () => labels[props.lang ?? parentLang()]
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

  const [hidden, setHidden] = createSignal(false, { name: 'toc-hidden' })

  const context = {
    entries: toc,
    register: (entry: TOCEntry) => {
      setEntries((entries) => [...entries, entry].sort(byDocumentOrder))
      return () => setEntries((entries) => entries.filter((e) => e !== entry))
    },
  }

  return (
    <div class="relative container mx-auto w-screen pb-1 xl:flex">
      <main
        class={[
          'prose prose-code:before:content-none prose-code:after:content-none grow overflow-auto scroll-smooth rounded-b-xl bg-white p-8 pb-200 shadow-sm',
          hidden() ? 'max-w-none' : 'max-w-270',
        ]}
      >
        <MDXProvider
          components={{
            h1: (attrs) => <Heading level={1}>{attrs.children}</Heading>,
            h2: (attrs) => <Heading level={2}>{attrs.children}</Heading>,
            h3: (attrs) => <Heading level={3}>{attrs.children}</Heading>,
            h4: (attrs) => <Heading level={4}>{attrs.children}</Heading>,
          }}
        >
          <TOCContext value={context}>
            <Boundary fallback={label().loading}>{props.children}</Boundary>
          </TOCContext>
        </MDXProvider>
      </main>
      <aside class="sticky top-0 flex max-w-96 gap-2 p-4 text-slate-600 xl:h-screen print:hidden">
        <button
          type="button"
          aria-label={hidden() ? label().show : label().hide}
          title={hidden() ? label().show : label().hide}
          aria-expanded={hidden() ? 'false' : 'true'}
          class="cursor-pointer self-center rounded p-2 hover:bg-slate-100"
          onClick={() => setHidden((hidden) => !hidden)}
        >
          <Fa icon={hidden() ? faChevronLeft : faChevronRight} />
        </button>
        <Show when={!hidden()}>
          <nav class="max-h-full overflow-y-auto">
            <h1 class="my-4 text-2xl font-bold">{label().contents}</h1>
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
                      'border-transparent hover:border-slate-300 hover:bg-slate-50':
                        active() !== i(),
                    },
                  ]}
                >
                  {entry.title()}
                </a>
              )}
            </For>
          </nav>
        </Show>
      </aside>
    </div>
  )
}
