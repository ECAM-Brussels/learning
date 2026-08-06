/* @refresh reload */
import { render } from '@solidjs/web'
import { Router } from './router'

import { Boundary, Code, Example, Exercise, Highlight, Latex, Remark } from '@learning/components'
import { MDXProvider } from '@learning/mdx'
import { Match, Switch } from 'solid-js'
import Layout from './Layout'
import './style.css'

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
        <Router>{(props) => <Layout>{props.children}</Layout>}</Router>
      </Boundary>
    </MDXProvider>
  ),
  document.getElementById('root')!,
)
