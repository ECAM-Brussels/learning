import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { faBook } from '@fortawesome/free-solid-svg-icons'
import {
  Boundary,
  BreadCrumbs,
  Code,
  Crumb,
  Example,
  Exercise,
  Fa,
  Highlight,
  Latex,
  Page,
  Remark,
} from '@learning/components'
import { MDXProvider } from '@learning/mdx'
import type { PathEnd } from '@solidjs/router'
import { Match, Switch, type ParentComponent } from 'solid-js'
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

const Navbar = () => (
  <nav class="mx-auto mb-0.5 bg-white shadow-sm">
    <div class="container mx-auto flex items-center justify-between gap-8">
      <NavLink class="text-xl font-bold text-sky-800" href={paths()}>
        learning
      </NavLink>
      <ul class="flex">
        <li>
          <NavLink href={paths.numerical}>Analyse numérique</NavLink>
        </li>
      </ul>
      <ul class="flex">
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
          <Match when={attrs['data-type'] === 'remark'}>
            <Remark {...attrs} />
          </Match>
        </Switch>
      ),
      Code,
      Highlight,
      Latex,
    }}
  >
    <Navbar />
    <Page>
      <Boundary>
        <Crumb href="/" title="Accueil">
          <BreadCrumbs />
          {props.children}
        </Crumb>
      </Boundary>
    </Page>
  </MDXProvider>
)
