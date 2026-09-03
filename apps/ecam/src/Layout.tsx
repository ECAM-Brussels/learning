import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { faBook } from '@fortawesome/free-solid-svg-icons'
import {
  Boundary,
  Code,
  Crumb,
  Example,
  Exercise,
  Fa,
  Highlight,
  Info,
  Latex,
  Question,
  Remark,
} from '@learning/components'
import { getUser, login, logout } from '@learning/core'
import { MDXProvider } from '@learning/mdx'
import type { PathEnd } from '@solidjs/router'
import { createMemo, Match, Show, Switch, type ParentComponent } from 'solid-js'
import { paths } from './router'

const NavLink: ParentComponent<{ class?: string; href: PathEnd | string }> = (props) => (
  <a
    href={props.href}
    class={[
      'block p-4 text-gray-400 hover:bg-sky-50 hover:text-sky-800 data-active:bg-gray-100 data-active:text-gray-600',
      props.class,
    ]}
  >
    {props.children}
  </a>
)

function Navbar() {
  const user = createMemo(() => getUser())
  return (
    <nav class="mx-auto mb-0.5 bg-white shadow-sm">
      <div class="container mx-auto flex items-center justify-between gap-8">
        <NavLink class="text-xl font-bold text-sky-800" href={paths()}>
          learning
        </NavLink>
        <ul class="flex items-center gap-4 text-gray-500">
          <Boundary>
            <Show
              when={user()}
              fallback={
                <li>
                  <button
                    class="cursor-pointer"
                    onClick={async () => {
                      await login({ provider: 'microsoft' })
                    }}
                  >
                    Login
                  </button>
                </li>
              }
            >
              <li>{user()?.name}</li>
              <li>
                <form action={logout} method="post">
                  <button class="cursor-pointer">Logout</button>
                </form>
              </li>
            </Show>
          </Boundary>
          <li>
            <NavLink href={paths.doc}>
              <Fa icon={faBook} />
            </NavLink>
          </li>
          <li>
            <NavLink href="https://github.com/ECAM-Brussels/learning">
              <Fa icon={faGithub} />
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export const Layout: ParentComponent = (props) => (
  <MDXProvider
    components={{
      div: (attrs) => (
        <Switch fallback={<div>{attrs.children}</div>}>
          <Match when={attrs['data-type'] === 'example'}>
            <Example {...attrs} />
          </Match>
          <Match when={attrs['data-type'] === 'exercise'}>
            <Exercise {...attrs} />
          </Match>
          <Match when={attrs['data-type'] === 'info'}>
            <Info {...attrs} />
          </Match>
          <Match when={attrs['data-type'] === 'question'}>
            <Question {...attrs} />
          </Match>
          <Match when={attrs['data-type'] === 'remark'}>
            <Remark {...attrs} />
          </Match>
        </Switch>
      ),
      table: (attrs) => <table class="mx-auto max-w-4/5" {...attrs} />,
      tr: (attrs) => <tr class="px-2 even:bg-slate-50" {...attrs} />,
      td: (attrs) => <td class="px-2" {...attrs} />,
      th: (attrs) => <th class="px-2" {...attrs} />,
      Code,
      Highlight,
      Latex,
    }}
  >
    <Navbar />
    <div class="container mx-auto">
      <Boundary>
        <Crumb href="/" title="Accueil">
          {props.children}
        </Crumb>
      </Boundary>
    </div>
  </MDXProvider>
)
