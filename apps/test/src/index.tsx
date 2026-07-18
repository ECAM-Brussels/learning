import { Route, Router } from '@solidjs/router'
/* @refresh reload */
import { render } from '@solidjs/web'

import { Boundary } from '@learning/components'
import { lazy } from 'solid-js'
import './style.css'

render(
  () => (
    <Boundary>
      <Router>
        <Route path="/" component={lazy(() => import('./routes/index'))} />
        <Route path="/test" component={lazy(() => import('./routes/test.mdx'))} />
        <Route path="/numerical" component={lazy(() => import('./routes/numerical/index'))} />
        <Route
          path="/numerical/01-python"
          component={lazy(() => import('./routes/numerical/01-python'))}
        />
      </Router>
    </Boundary>
  ),
  document.getElementById('root')!,
)
