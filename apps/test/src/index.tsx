/* @refresh reload */
import { Route, Router } from '@solidjs/router'
import { render } from '@solidjs/web'

import { Boundary, Code, Heading, Latex } from '@learning/components'
import { MDXProvider } from '@learning/mdx'
import { lazy, Match, Switch } from 'solid-js'
import './style.css'

render(
  () => (
    <Boundary>
      <MDXProvider
        components={{
          h1: (props) => <Heading level={1}>{props.children}</Heading>,
          h2: (props) => <Heading level={2}>{props.children}</Heading>,
          h3: (props) => <Heading level={3}>{props.children}</Heading>,
          h4: (props) => <Heading level={4}>{props.children}</Heading>,
          code: (props) => (
            <Switch fallback={<code>{props.children}</code>}>
              <Match when={props.className?.includes('language-python')}>
                <Code
                  lang="python"
                  math={'data-meta' in props && String(props['data-meta'] ?? '').includes('math')}
                  run={'data-meta' in props && String(props['data-meta'] ?? '').includes('run')}
                >
                  {String(props.children).trim()}
                </Code>
              </Match>
              <Match when={props.className?.includes('language-math')}>
                <Latex
                  value={String(props.children)}
                  displayMode={props.className?.includes('math-display')}
                />
              </Match>
            </Switch>
          ),
          pre: (props) => <>{props.children}</>,
        }}
      >
        <Router>
          <Route path="/" component={lazy(() => import('./routes/index'))} />
          <Route path="/test" component={lazy(() => import('./routes/test.mdx'))} />
          <Route path="/numerical" component={lazy(() => import('./routes/numerical/index'))} />
          <Route
            path="/numerical/01-python"
            component={lazy(() => import('./routes/numerical/01-python'))}
          />
        </Router>
      </MDXProvider>
    </Boundary>
  ),
  document.getElementById('root')!,
)
