/// <reference path="../file-routes.d.ts" />

import { createAPIHandler } from 'filesystem-routing/api'
import routes from 'virtual:file-routes'

export default [createAPIHandler(routes)]
