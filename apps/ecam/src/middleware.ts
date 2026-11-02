import { getAuth } from '@learning/auth'
import { getRole } from '@learning/core'
import type { RequestEvent } from '@solidjs/web'

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
