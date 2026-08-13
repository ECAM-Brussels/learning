import { handleRequest } from 'virtual:solid-ssr-handler'

export default {
  fetch(request: Request) {
    return handleRequest(request)
  },
}
