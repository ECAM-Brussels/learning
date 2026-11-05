import { defineMdastPlugin } from 'satteri'

function component(name: string, attributes: Record<string, unknown>): {
  type: 'mdxJsxFlowElement'
  name: string
  attributes: Array<{
    type: 'mdxJsxAttribute'
    name: string
    value: null | { type: 'mdxJsxAttributeValueExpression'; value: string }
  }>
  children: []
}
function component<C extends unknown[]>(
  name: string,
  attributes: Record<string, unknown>,
  children: C,
): {
  type: 'mdxJsxFlowElement'
  name: string
  attributes: Array<{
    type: 'mdxJsxAttribute'
    name: string
    value: null | { type: 'mdxJsxAttributeValueExpression'; value: string }
  }>
  children: C
}
function component(name: string, attributes: Record<string, unknown>, children: unknown[] = []) {
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
    children,
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
    const highlight: number[] = []
    const match = node.meta?.match(/highlight="([^"]*)"/)
    if (match && match[1]) {
      const list = match[1].split(',').flatMap((item) => {
        const [start, end] = item.split('-').map(Number) as [number, number | undefined]
        return end !== undefined
          ? Array.from({ length: end - start + 1 }, (_, i) => start + i)
          : [start]
      })
      highlight.push(...list)
    }
    if (node.lang === 'python' && run) {
      const math = node.meta?.includes('math') ?? false
      return component('Code', { lang: node.lang, children: node.value, run, math, highlight })
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

const steps = defineMdastPlugin({
  name: 'steps',
  containerDirective(node, ctx) {
    if (node.name !== 'steps') return

    const [labelNode, ...children] = node.children
    const isLabel = Boolean(
      (labelNode as { data?: { directiveLabel?: boolean } } | undefined)?.data?.directiveLabel,
    )

    const list = isLabel ? children[0] : labelNode
    if (!list || list.type !== 'list' || !list.ordered) return

    const sections = list.children.map((item) => component('section', {}, [...item.children]))
    const wrapped = component('Steps', {}, sections)

    const rest = isLabel ? children.slice(1) : node.children.slice(1)
    if (isLabel && labelNode) {
      ctx.setProperty(node, 'children', [labelNode, wrapped, ...rest])
      return
    }
    ctx.setProperty(node, 'children', [wrapped, ...rest])
  },
})

export default {
  features: { math: true, directive: true },
  mdx: { jsx: true, providerImportSource: '@learning/mdx' },
  mdastPlugins: [code, steps, directives, math],
}
