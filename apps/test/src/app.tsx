/* @refresh reload */
import { Boundary, Code, Example, Exercise, Latex, Remark } from '@learning/components'
import { MDXProvider } from '@learning/mdx'
import { Match, Switch } from 'solid-js'
import Layout from './Layout'
import { Router } from './router'

export default () => (
  <Router>
    {(props) => (
      <Boundary>
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
            Highlight: (props) => <code {...props} />,
            Latex,
          }}
        >
          <Layout>{props.children}</Layout>
        </MDXProvider>
      </Boundary>
    )}
  </Router>
)
