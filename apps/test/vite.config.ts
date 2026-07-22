import tailwindcss from '@tailwindcss/vite'
import { defineHastPlugin, defineMdastPlugin } from 'satteri'
import { defineConfig } from 'vite'
import satteri from 'vite-plugin-satteri'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [
    satteri({
      features: { math: true, directive: true },
      mdx: { jsxImportSource: '@learning/mdx', providerImportSource: '@learning/mdx' },
      mdastPlugins: [
        defineMdastPlugin({
          name: 'directives',
          containerDirective(node) {
            if (node.name === 'example') {
              return {
                type: 'mdxJsxFlowElement',
                name: 'div',
                attributes: [
                  {
                    type: 'mdxJsxAttribute',
                    name: 'class',
                    value: 'example',
                  },
                ],
                children: node.children,
              }
            }
          },
        }),
      ],
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
