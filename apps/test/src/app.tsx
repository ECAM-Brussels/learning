/* @refresh reload */
import { render } from '@solidjs/web'
import { paths, Router } from './router'

import { Boundary, Code, Example, Heading, Latex } from '@learning/components'
import { MDXProvider } from '@learning/mdx'
import { Match, Switch, type ParentComponent } from 'solid-js'
import './style.css'

const NavLink: ParentComponent<{ class?: string; href: typeof paths.doc | string }> = (props) => (
  <a
    href={props.href}
    class={['block p-4 text-gray-500 hover:bg-sky-50 hover:text-sky-800', props.class]}
  >
    {props.children}
  </a>
)

const Navbar = () => (
  <nav class="sticky bg-white shadow-sm">
    <ul class="container mx-auto flex">
      <li>
        <NavLink class="font-bold text-sky-800" href={paths()}>
          learning
        </NavLink>
      </li>
      <li>
        <NavLink href={paths.doc}>Documentation</NavLink>
      </li>
      <li>
        <NavLink href={paths.numerical}>Analyse numérique</NavLink>
      </li>
    </ul>
  </nav>
)

render(
  () => (
    <Boundary>
      <Router>
        {(props) => (
          <>
            <Navbar />
            <MDXProvider
              components={{
                h1: (props) => <Heading level={1}>{props.children}</Heading>,
                h2: (props) => <Heading level={2}>{props.children}</Heading>,
                h3: (props) => <Heading level={3}>{props.children}</Heading>,
                h4: (props) => <Heading level={4}>{props.children}</Heading>,
                div: (props) => (
                  <Switch fallback={<div>{props.children}</div>}>
                    <Match when={props['data-type'] === 'example'}>
                      <Example {...props} />
                    </Match>
                  </Switch>
                ),
                Code,
                Latex,
              }}
            >
              {props.children}
            </MDXProvider>
          </>
        )}
      </Router>
    </Boundary>
  ),
  document.getElementById('root')!,
)
