import { defineMdastPlugin } from 'satteri'

function component(name: string, attributes: Record<string, unknown>) {
  return {
    type: 'mdxJsxFlowElement' as const,
    name,
    attributes: Object.entries(attributes)
      .filter(([, value]) => value !== false && value != null)
      .map(([name, value]) => ({
        type: 'mdxJsxAttribute' as const,
        name,
        value:
          value === true
            ? null
            : { type: 'mdxJsxAttributeValueExpression' as const, value: JSON.stringify(value) },
      })),
    children: [],
  }
}

const directives = defineMdastPlugin({
  name: 'directives',
  containerDirective(node, ctx) {
    const [labelNode, ...children] = node.children
    const isLabel = Boolean(
      (labelNode as { data?: { directiveLabel?: boolean } } | undefined)?.data?.directiveLabel,
    )
    const label = isLabel
      ? (labelNode as unknown as { children: Array<{ value?: string }> }).children
          .map(({ value }) => value ?? '')
          .join('')
      : undefined

    ctx.setProperty(node, 'children', isLabel ? children : node.children)
    ctx.setProperty(node, 'data', {
      hName: 'div',
      hProperties: {
        'data-type': node.name,
        'data-label': label,
        ...node.attributes,
      },
    })
  },
})

const code = defineMdastPlugin({
  name: 'code-meta',
  code(node) {
    const run = node.meta?.includes('run') ?? false
    if (node.lang === 'python' && run) {
      const math = node.meta?.includes('math') ?? false
      return component('Code', { lang: node.lang, children: node.value, run, math })
    }
    return component('Highlight', {
      lang: node.lang === 'mdx' ? 'jsx' : node.lang,
      code: node.value,
    })
  },
})

const math = defineMdastPlugin({
  name: 'math',
  inlineMath: (node) => component('Latex', { value: node.value }),
  math: (node) => component('Latex', { value: node.value, displayMode: true }),
})

export default {
  features: { math: true, directive: true },
  mdx: { jsx: true, providerImportSource: '@learning/mdx' },
  mdastPlugins: [code, directives, math],
}
