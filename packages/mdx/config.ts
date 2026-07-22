import { defineMdastPlugin } from 'satteri'

const directives = defineMdastPlugin({
  name: 'directives',
  containerDirective(node, ctx) {
    ctx.setProperty(node, 'data', {
      hName: 'div',
      hProperties: {
        'data-type': node.name,
        ...node.attributes,
      },
    })
  },
})

const code = defineMdastPlugin({
  name: 'code-meta',
  code(node) {
    if (node.lang === 'python') {
      const run = node.meta?.includes('run') ?? false
      const math = node.meta?.includes('math') ?? false
      return {
        type: 'mdxJsxFlowElement',
        name: 'Code',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'lang', value: node.lang },
          { type: 'mdxJsxAttribute', name: 'children', value: node.value },
          ...(run ? [{ type: 'mdxJsxAttribute' as const, name: 'run', value: null }] : []),
          ...(math ? [{ type: 'mdxJsxAttribute' as const, name: 'math', value: null }] : []),
        ],
        children: [],
      }
    }
    return {
      type: 'mdxJsxFlowElement',
      name: 'Highlight',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'lang', value: node.lang === 'mdx' ? 'jsx' : node.lang },
        { type: 'mdxJsxAttribute', name: 'code', value: node.value },
      ],
      children: [],
    }
  },
})

const math = defineMdastPlugin({
  name: 'math',
  inlineMath: (node) => ({
    type: 'mdxJsxTextElement',
    name: 'Latex',
    attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: node.value }],
    children: [],
  }),
  math: (node) => ({
    type: 'mdxJsxFlowElement',
    name: 'Latex',
    attributes: [
      { type: 'mdxJsxAttribute', name: 'value', value: node.value },
      { type: 'mdxJsxAttribute', name: 'displayMode', value: null },
    ],
    children: [],
  }),
})

export default {
  features: { math: true, directive: true },
  mdx: { jsxImportSource: '@learning/mdx', providerImportSource: '@learning/mdx' },
  mdastPlugins: [code, directives, math],
}
