/// <reference path="../file-routes.d.ts" />

import { auth } from '@learning/auth'
import { composeMiddleware, getRequestEvent } from '@solidjs/web'
import { createAPIHandler } from 'filesystem-routing/api'
import routes from 'virtual:file-routes'

export default composeMiddleware([
  createAPIHandler(routes),
  async (request, next) => {
    getRequestEvent()!.locals.user =
      (await auth.api.getSession({ headers: request.headers }))?.user ?? null
    return next(request)
  },
])
