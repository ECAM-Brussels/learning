import { getAuth } from '@learning/auth'
import { getRole } from '@learning/core'
import { composeMiddleware, getRequestEvent } from '@solidjs/web'

export default composeMiddleware([
  async (request, next) => {
    const pathname = new URL(request.url).pathname
    const locals = getRequestEvent()!.locals

    if (pathname.startsWith('/api/auth')) return getAuth().handler(request)
    if (!request.headers.get('cookie')) {
      locals.user = null
      locals.role = null
      return next(request)
    }

    locals.user = (await getAuth().api.getSession({ headers: request.headers }))?.user ?? null
    locals.role = await getRole()
    return next(request)
  },
])
