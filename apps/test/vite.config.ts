import tailwindcss from '@tailwindcss/vite'
import { defineHastPlugin } from 'satteri'
import { defineConfig } from 'vite'
import satteri from 'vite-plugin-satteri'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [
    satteri({
      features: { math: true },
      mdx: { jsxImportSource: '@learning/mdx', providerImportSource: '@learning/mdx' },
      hastPlugins: [
        defineHastPlugin({
          name: 'code-meta',
          element: {
            filter: ['code'],
            visit(node, ctx) {
              if (node.data && 'meta' in node.data)
                ctx.setProperty(node, 'data-meta', node.data.meta)
            },
          },
        }),
      ],
    }),
    solidPlugin(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
})
