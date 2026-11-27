import saterriConfig from '@learning/mdx/config'
import solidPlugin from '@solidjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { routePathFromFile } from 'filesystem-routing'
import { fileRoutes } from 'filesystem-routing/vite'
import { defineConfig } from 'vite'
import satteri from 'vite-plugin-satteri'

export default defineConfig({
  plugins: [
    satteri(saterriConfig),
    solidPlugin({
      diagnostics: true,
      env: './env.ts',
      extensions: ['.mdx'],
      start: {
        middleware: 'src/middleware.ts',
      },
      serverFunctions: {
        filter: {
          include: [
            'src/**/*.ts',
            'src/**/*.tsx',
            '../../packages/**/*.ts',
            '../../packages/**/*.tsx',
          ],
          exclude: ['**/node_modules/**'],
        },
      },
    }),
    fileRoutes({
      types: true,
      extensions: ['mdx', 'tsx', 'ts'],
      toPath: (file) => {
        if (file.includes('.')) return undefined
        return routePathFromFile(file).replace(/\/_layout$/, '')
      },
    }) as any,
    tailwindcss(),
  ],
  server: {
    port: 3000,
    // VS Code forwards ports over IPv4, but "localhost" alone binds only [::1] here.
    host: true,
  },
  build: {
    target: 'esnext',
  },
})
