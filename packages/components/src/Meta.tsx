import { Title } from '@solidjs/meta'
import { useLocation, type PathEnd } from '@solidjs/router'
import { type JSX } from '@solidjs/web'
import { createContext, createMemo, createStore, onSettled, Show, useContext } from 'solid-js'

export type Lang = 'fr' | 'en'

type Crumb = { href: PathEnd | string; title: string }

type Meta = {
  title: string
  /** The current page if omitted. */
  href?: PathEnd | string
  /** Put before the title in the browser tab; inherited by the levels inside. */
  prefix?: string
  /** Inherited by the levels inside; French if no level sets it. */
  lang?: Lang
  authorized?: () => boolean | Promise<boolean>
}

const MetaContext = createContext<{
  level: number
  // Shared by every level: BreadCrumbs is usually rendered above the levels it shows.
  crumbs: Crumb[]
  setCrumbs: (update: (crumbs: Crumb[]) => void) => void
  prefix: () => string | undefined
  lang: () => Lang
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
    <MetaContext value={{ level, crumbs, setCrumbs, prefix, lang }}>
      <Title>
        {prefix()} {props.title}
      </Title>
      <Show when={authorized()} fallback={<p>{unauthorized[lang()]}</p>}>
        {props.children}
      </Show>
    </MetaContext>
  )
}

export function defineMeta(meta: Meta) {
  return (props: { children: JSX.Element }) => {
    return <Meta {...meta} {...props} />
  }
}

export function useCrumbs(): readonly Crumb[] {
  return useContext(MetaContext)?.crumbs ?? []
}

export function useLang(): () => Lang {
  const context = useContext(MetaContext)
  return () => context?.lang() ?? 'fr'
}
