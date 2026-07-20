/* @refresh reload */
import { Route, Router } from '@solidjs/router'
import { render } from '@solidjs/web'

import { Boundary, Heading } from '@learning/components'
import { MDXProvider } from '@learning/mdx'
import { lazy } from 'solid-js'
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
