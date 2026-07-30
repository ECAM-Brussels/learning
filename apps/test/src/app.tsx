/* @refresh reload */
import { render } from '@solidjs/web'
import { paths, Router } from './router'

import { Boundary, Code, Example, Exercise, Highlight, Latex, Remark } from '@learning/components'
import { MDXProvider } from '@learning/mdx'
import type { PathEnd } from '@solidjs/router'
import { Match, Switch, type ParentComponent } from 'solid-js'
import './style.css'

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
  <nav class="sticky top-0 z-10 mx-auto bg-white shadow-sm">
    <div class="container mx-auto flex items-center gap-8">
      <NavLink class="text-xl font-bold text-sky-800" href={paths()}>
        learning
      </NavLink>
      <ul class="flex">
        <li></li>
        <li>
          <NavLink href={paths.doc}>Documentation</NavLink>
        </li>
        <li>
          <NavLink href={paths.numerical}>Analyse numérique</NavLink>
        </li>
      </ul>
    </div>
  </nav>
)

render(
  () => (
    <MDXProvider
      components={{
        div: (props) => (
          <Switch fallback={<div>{props.children}</div>}>
            <Match when={props['data-type'] === 'example'}>
              <Example {...props} />
            </Match>
            <Match when={props['data-type'] === 'exercise'}>
              <Exercise {...props} />
            </Match>
            <Match when={props['data-type'] === 'remark'}>
              <Remark {...props} />
            </Match>
          </Switch>
        ),
        Code,
        Highlight,
        Latex,
      }}
    >
      <Boundary>
        <Router>
          {(props) => (
            <>
              <Navbar />
              {props.children}
            </>
          )}
        </Router>
      </Boundary>
    </MDXProvider>
  ),
  document.getElementById('root')!,
)
