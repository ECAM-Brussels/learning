import { handleRequest } from 'virtual:solid-ssr-handler'

export default {
  async fetch(request: Request) {
    console.log('WORKER REQUEST', request.method, new URL(request.url).pathname)

    try {
      const response = await handleRequest(request)

      console.log('WORKER RESPONSE', response.status)

      return response
    } catch (error) {
      console.error('WORKER ERROR', error)
      throw error
    }
  },
}
