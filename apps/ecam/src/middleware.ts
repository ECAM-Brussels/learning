import { getAuth } from '@learning/auth'
import { getRole, registerPageSources } from '@learning/core'
import type { RequestEvent } from '@solidjs/web'
import { routePathFromFile } from 'filesystem-routing'

// Who may draw on a deck is written in its page, which the server reads rather than trust the browser.
registerPageSources(
  import.meta.glob<string>('./routes/**/*.{mdx,tsx}', { query: '?raw', import: 'default' }),
  (file) => {
    const route = file.replace(/^\.\/routes/, '').replace(/\.(mdx|tsx)$/, '')
    if (route.split('/').pop()!.includes('.') || route.endsWith('/_layout')) return undefined
    return routePathFromFile(route)
  },
)

export default async (event: RequestEvent, next: () => Promise<Response>) => {
  const request = event.request
  const locals = event.locals
  const pathname = new URL(request.url, 'http://localhost').pathname

  if (pathname.startsWith('/api/auth')) return getAuth().handler(request)
  if (!request.headers.get('cookie')) {
    locals.user = null
    locals.role = 'guest'
    return next()
  }

  locals.user = (await getAuth().api.getSession({ headers: request.headers }))?.user ?? null
  locals.role = await getRole()
  return next()
}
