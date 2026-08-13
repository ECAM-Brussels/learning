import { endpoint, handleServerFunctionRequest } from 'virtual:solid-server-function-handler'

export default {
  fetch(request: Request, env: { ASSETS: { fetch(request: Request): Promise<Response> } }) {
    if (new URL(request.url).pathname === endpoint) {
      return handleServerFunctionRequest(request)
    }

    return env.ASSETS.fetch(request)
  },
}
