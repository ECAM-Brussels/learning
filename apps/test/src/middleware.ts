import { getAuth } from '@learning/auth'
import { composeMiddleware, getRequestEvent } from '@solidjs/web'

export default composeMiddleware([
  async (request, next) => {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/auth')) return getAuth().handler(request)

    const cookie = request.headers.get('cookie')
    if (!cookie) {
      getRequestEvent()!.locals.user = null
      return next(request)
    }

    getRequestEvent()!.locals.user =
      (await getAuth().api.getSession({ headers: request.headers }))?.user ?? null
    return next(request)
  },
])
