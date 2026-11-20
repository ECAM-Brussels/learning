/// <reference types="./node_modules/@solidjs/vite-plugin/virtual-modules" />
import type { Serve } from 'bun'

// The server bundle (entry: `virtual:solid-ssr-handler`) only exists after `vite build`,
// so it is imported through a non-literal specifier and typed from the plugin's declarations.
const { handleRequest }: typeof import('virtual:solid-ssr-handler') = await import(
  './dist/server/server.js' as string
)

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
