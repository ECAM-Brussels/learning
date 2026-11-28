import { Title } from '@solidjs/meta'
import { useLocation, type PathEnd } from '@solidjs/router'
import { type JSX } from '@solidjs/web'
import { createContext, createMemo, createStore, onSettled, Show, useContext } from 'solid-js'

export type Lang = 'fr' | 'en'

type Crumb = { href: PathEnd | string; title: string }

type Meta = {
  /** The page's title, shown in the browser tab and the breadcrumbs, and on a presentation's title slide. */
  title: string
  /** The current page if omitted. */
  href?: PathEnd | string
  /** Put before the title in the browser tab; inherited by the levels inside. */
  prefix?: string
  /** Inherited by the levels inside; French if no level sets it. */
  lang?: Lang
  /** Whether the reader may see the page, such as a test before its date: everyone if omitted. */
  authorized?: () => boolean | Promise<boolean>
  /** Shown with the title on a presentation's title slide, like the next three. */
  subtitle?: string
  author?: string
  institute?: string
  date?: string
}

const MetaContext = createContext<{
  level: number
  // Shared by every level: BreadCrumbs is usually rendered above the levels it shows.
  crumbs: Crumb[]
  setCrumbs: (update: (crumbs: Crumb[]) => void) => void
  prefix: () => string | undefined
  lang: () => Lang
  meta: Meta
} | null>(null)

const unauthorized = {
  fr: "Vous n'avez pas l'autorisation de voir cette page",
  en: 'You are not allowed to see this page',
} satisfies Record<Lang, string>

/** Nested levels inherit the prefix and language, and the browser tab shows the innermost title. */
export function Meta(props: Meta & { children: JSX.Element }) {
  const parent = useContext(MetaContext)
  const level = parent ? parent.level + 1 : 0
  const [crumbs, setCrumbs] = parent ? [parent.crumbs, parent.setCrumbs] : createStore<Crumb[]>([])
  const location = useLocation()
  const prefix = () => props.prefix ?? parent?.prefix()
  const lang = () => props.lang ?? parent?.lang() ?? 'fr'
  const authorized = createMemo(() => props.authorized?.() ?? true)

  const crumb: Crumb = {
    get href() {
      return props.href ?? location.pathname
    },
    get title() {
      return props.title
    },
  }
  onSettled(() => {
    setCrumbs((s) => {
      s[level] = crumb
    })
    return () => {
      setCrumbs((s) => {
        s.splice(level, 1)
      })
    }
  })

  return (
    <MetaContext value={{ level, crumbs, setCrumbs, prefix, lang, meta: props }}>
      <Title>
        {prefix()} {props.title}
      </Title>
      <Show when={authorized()} fallback={<p>{unauthorized[lang()]}</p>}>
        {props.children}
      </Show>
    </MetaContext>
  )
}

/**
 * The page's metadata, exported by default at the top of an MDX page:
 * its title, and what a presentation's title slide shows, such as `author` and `date`.
 *
 * @example
 * import { defineMeta } from '@learning/components'
 *
 * export default defineMeta({
 *   title: 'Les dérivées',
 *   author: 'Prénom Nom',
 *   date: 'Novembre 2026',
 * })
 */
export function defineMeta(meta: Meta) {
  return (props: { children: JSX.Element }) => {
    return <Meta {...meta} {...props} />
  }
}

export function useCrumbs(): readonly Crumb[] {
  return useContext(MetaContext)?.crumbs ?? []
}

/** The innermost level's metadata, usually the page's. */
export function useMeta(): Meta | undefined {
  return useContext(MetaContext)?.meta
}

export function useLang(): () => Lang {
  const context = useContext(MetaContext)
  return () => context?.lang() ?? 'fr'
}
