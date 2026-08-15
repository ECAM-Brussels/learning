import type { Serve } from 'bun'
import { handleRequest } from './dist/server/server.js'

const MIME = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
}

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname
    const ext = path.slice(path.lastIndexOf('.')) as keyof typeof MIME
    if (path !== '/' && !path.includes('..')) {
      const file = Bun.file(`./dist/client${path}`)
      if (await file.exists()) {
        return new Response(file, {
          headers: { 'Content-Type': MIME[ext] ?? 'application/octet-stream' },
        })
      }
    }

    try {
      return await handleRequest(request)
    } catch (error) {
      return new Response(error instanceof Error ? error.message : 'Internal Server Error', {
        status: 500,
      })
    }
  },
} satisfies Serve.Options<undefined>
