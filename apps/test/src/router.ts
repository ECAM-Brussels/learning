import { createRouter } from '@solidjs/router'
import { lazy } from 'solid-js'

export const Router = createRouter({
  routes: [
    { path: '/', component: lazy(() => import('./routes/index.mdx')) },
    { path: '/doc', component: lazy(() => import('./routes/doc/index.mdx')) },
    { path: '/doc/exercise', component: lazy(() => import('./routes/doc/exercise.mdx')) },
    { path: '/numerical', component: lazy(() => import('./routes/numerical/index.mdx')) },
    {
      path: '/numerical/01-python',
      component: lazy(() => import('./routes/numerical/01-python.mdx')),
    },
  ],
})

export const { paths } = Router
