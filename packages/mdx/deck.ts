import { defineMdastPlugin } from 'satteri'
import { parse as parseYaml } from 'yaml'

type Node = {
  type: string
  value?: string
  depth?: number
  name?: string | null
  ordered?: boolean
  attributes?: Attribute[]
  children?: Node[]
  data?: { directiveLabel?: boolean }
  url?: string
}

type Attribute =
  | { type: 'mdxJsxAttribute'; name: string; value: null | string | { value: string } }
  | { type: 'mdxJsxExpressionAttribute'; value: string }

type Props = Record<string, string | true | { expression: string }>

function element(name: string, props: Props, children: Node[] = []): Node {
  return {
    type: 'mdxJsxFlowElement',
    name,
    attributes: Object.entries(props).map(([name, value]) => ({
      type: 'mdxJsxAttribute',
      name,
      value:
        value === true
          ? null
          : typeof value === 'string'
            ? value
            : { type: 'mdxJsxAttributeValueExpression', value: value.expression },
    })) as Attribute[],
    children,
  }
}

const text = (node: Node): string => node.value ?? node.children?.map(text).join('') ?? ''

const tags: Record<string, string> = {
  emphasis: 'em',
  strong: 'strong',
  delete: 'del',
  link: 'a',
}

function attributeSource(attribute: Attribute) {
  if (attribute.type === 'mdxJsxExpressionAttribute') return `{${attribute.value}}`
  const { name, value } = attribute
  if (value === null) return name
  return `${name}={${typeof value === 'string' ? JSON.stringify(value) : value.value}}`
}

/**
 * JSX source for phrasing content, such as a heading's, to pass it as a prop.
 * MDX compiles JSX in props like any other, with the components it is given.
 */
function phrasing(nodes: Node[]): string {
  return nodes
    .map((node) => {
      const children = () => phrasing(node.children ?? [])
      switch (node.type) {
        case 'text':
          return `{${JSON.stringify(node.value)}}`
        case 'inlineCode':
          return `<code>{${JSON.stringify(node.value)}}</code>`
        case 'inlineMath':
          return `<Latex value={${JSON.stringify(node.value)}} />`
        case 'break':
          return '<br />'
        case 'mdxTextExpression':
          return `{${node.value}}`
        // The math plugin turns inline maths into a flow element too.
        case 'mdxJsxTextElement':
        case 'mdxJsxFlowElement': {
          const attributes = (node.attributes ?? []).map((a) => ` ${attributeSource(a)}`).join('')
          return `<${node.name}${attributes}>${children()}</${node.name}>`
        }
        default: {
          const tag = tags[node.type]
          if (!tag) return `{${JSON.stringify(text(node))}}`
          const href = node.type === 'link' ? ` href={${JSON.stringify(node.url)}}` : ''
          return `<${tag}${href}>${children()}</${tag}>`
        }
      }
    })
    .join('')
}

const withoutLabel = (node: Node) =>
  (node.children ?? []).filter((child) => !child.data?.directiveLabel)

const isDirective = (node: Node, name: string) =>
  node.type === 'containerDirective' && node.name === name

/** Turns the directives meant for slides into components. */
function block(node: Node): Node[] {
  if (isDirective(node, 'notes')) return [element('Deck.Notes', {}, withoutLabel(node))]
  if (isDirective(node, 'incremental')) {
    return withoutLabel(node).flatMap((child) =>
      child.type === 'list'
        ? [
            element(
              child.ordered ? 'ol' : 'ul',
              {},
              (child.children ?? []).map((item) =>
                element('Deck.Fragment', { as: 'li' }, item.children ?? []),
              ),
            ),
          ]
        : block(child),
    )
  }
  if (isDirective(node, 'columns')) {
    return [
      element(
        'Deck.Columns',
        {},
        withoutLabel(node).map((child) =>
          isDirective(child, 'column')
            ? element('div', {}, withoutLabel(child).flatMap(block))
            : child,
        ),
      ),
    ]
  }
  return [node]
}

const isPause = (node: Node) => node.type === 'paragraph' && text(node).trim() === '. . .'

/** What follows a `. . .` paragraph appears on the next step, and so on for every pause. */
function pauses(nodes: Node[]): Node[] {
  const index = nodes.findIndex(isPause)
  if (index === -1) return nodes
  const rest = pauses(nodes.slice(index + 1))
  return [
    ...nodes.slice(0, index),
    element('Deck.Fragment', { as: 'div', class: 'space-y-6' }, rest),
  ]
}

const outside = (node: Node) => node.type === 'mdxjsEsm' || node.type === 'yaml'

/**
 * The slides of a document: `#` opens a section, `##` a slide with that title,
 * `---` a slide without one, and a `<Deck.…>` element is a slide of its own.
 * Each section is a vertical stack, headed by its section slide; slides before the first section stay horizontal.
 * The title slide comes first, from the page's `defineMeta`.
 */
export function toDeck(children: Node[]): Node[] {
  const slides: Node[] = [element('Deck.Title', {})]
  let section: Node[] | undefined
  let current: { name: string; title?: Node[]; children: Node[] } | undefined
  const close = () => {
    if (!current) return
    const props: Props = current.title
      ? { title: { expression: `<>${phrasing(current.title)}</>` } }
      : {}
    ;(section ?? slides).push(element(current.name, props, pauses(current.children)))
    current = undefined
  }
  const closeSection = () => {
    close()
    if (section) slides.push(element('Deck.Stack', {}, section))
    section = undefined
  }
  for (const node of children.filter((node) => !outside(node))) {
    if (node.type === 'heading' && node.depth === 1) {
      closeSection()
      section = []
      current = { name: 'Deck.Section', title: node.children ?? [], children: [] }
    } else if (node.type === 'heading' && node.depth === 2) {
      close()
      current = { name: 'Deck.Slide', title: node.children ?? [], children: [] }
    } else if (node.type === 'thematicBreak') {
      close()
      current = { name: 'Deck.Slide', children: [] }
    } else if (node.type === 'mdxJsxFlowElement' && node.name?.startsWith('Deck.')) {
      if (node.name === 'Deck.Stack' && section) {
        throw new Error(
          'A section is already a stack: `<Deck.Stack>` can only come before the first `#`',
        )
      }
      close()
      ;(section ?? slides).push(node)
    } else {
      current ??= { name: 'Deck.Slide', children: [] }
      current.children.push(...block(node))
    }
  }
  closeSection()
  return [...children.filter(outside), element('Deck', { page: true }, slides)]
}

/**
 * Makes a presentation of a document whose frontmatter has `deck: true`.
 * Nothing else goes in the frontmatter: a page's title and authors go in `defineMeta`, as on every page.
 * Runs after the other plugins, so that it moves what they have already turned into components.
 */
export const deck = defineMdastPlugin({
  name: 'deck',
  yaml(node, ctx) {
    const frontmatter: unknown = parseYaml(node.value) ?? {}
    if (typeof frontmatter !== 'object' || frontmatter === null) {
      throw new Error('The frontmatter should be `deck: true`')
    }
    const others = Object.keys(frontmatter).filter((key) => key !== 'deck')
    if (others.length > 0) {
      throw new Error(
        `Unexpected frontmatter ${others.map((key) => `\`${key}\``).join(', ')}: ` +
          'the frontmatter only says `deck: true`, the rest goes in defineMeta',
      )
    }
    const { deck } = frontmatter as { deck?: unknown }
    if (deck === undefined || deck === false) return
    if (deck !== true) throw new Error('`deck` should be `true` or `false`')
    const root = ctx.parent(node) as unknown as Node
    ctx.setProperty(root as never, 'children', toDeck(root.children ?? []) as never)
  },
})
