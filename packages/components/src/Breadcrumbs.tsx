import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { Title } from '@solidjs/meta'
import { type JSX } from '@solidjs/web'
import { createContext, createStore, For, omit, onSettled, Show, useContext } from 'solid-js'
import { Fa } from './Fa'

type Crumb = { href: string; title: string }
const CrumbContext = createContext<{ level: number; crumbs: readonly Crumb[] } | null>(null)

export function BreadCrumbs() {
  const context = useContext(CrumbContext)
  return (
    <ul class="not-prose mb-4 flex list-none gap-2 p-0 text-sm text-gray-400">
      <For each={context?.crumbs}>
        {(crumb, i) => (
          <>
            <li>
              <a href={crumb.href}>{crumb.title}</a>
            </li>
            <Show when={i() < (context?.crumbs.length ?? 0) - 1}>
              <li>
                <Fa icon={faChevronRight} />
              </li>
            </Show>
          </>
        )}
      </For>
    </ul>
  )
}

export function Crumb(
  props: Crumb & {
    children: JSX.Element
  },
) {
  const crumb = omit(props, 'children')
  const context = useContext(CrumbContext)
  const [crumbs, setCrumbs] = createStore<Crumb[]>(context?.crumbs ?? [])
  const position = context?.level ?? 0

  onSettled(() => {
    setCrumbs((s) => {
      s[position] = crumb
    })

    return () => {
      setCrumbs((s) => {
        s.splice(position, 1)
      })
    }
  })

  return (
    <CrumbContext value={{ level: position + 1, crumbs }}>
      <Title>{props.title}</Title>
      {props.children}
    </CrumbContext>
  )
}
