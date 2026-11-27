import { defineMdastPlugin } from 'satteri'
import { deckBrackets } from './brackets.ts'

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
    element('Deck.Fragment', { as: 'div', class: 'space-y-9' }, rest),
  ]
}

/**
 * The slides of a deck: `#` opens a section, `##` a slide with that title,
 * `---` a slide without one, and a `<Deck.…>` element is a slide of its own.
 * Each section is a vertical stack, headed by its section slide; slides before the first section stay horizontal.
 */
export function toSlides(children: Node[]): Node[] {
  const slides: Node[] = []
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
  for (const node of children) {
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
  return slides
}

/** The text in a deck's brackets, which the directives plugin, run before, keeps as `data-label`. */
function label(node: Node & { data?: { hProperties?: Record<string, unknown> } }) {
  const label = node.data?.hProperties?.['data-label']
  return typeof label === 'string' ? label : undefined
}

/**
 * A `:::::deck` block is a presentation.
 * It opens on a title slide when its brackets give one, as `:::::deck[title="…" author="…"]`,
 * rather than in braces, which trip the MDX language server:
 * what the title slide is not given comes from the page's `defineMeta`.
 * `annotators="…"` lists who may draw on the deck, and `id="…"` tells apart the decks of a page that do.
 * Runs after the other plugins, so that it moves what they have already turned into components.
 */
export const deck = defineMdastPlugin({
  name: 'deck',
  containerDirective(node) {
    if (node.name !== 'deck') return
    const deck = node as unknown as Node
    if (Object.keys(node.attributes ?? {}).length > 0) {
      throw new Error('Write a deck\'s title slide in brackets, as `:::::deck[title="…"]`')
    }
    const source = label(deck)
    const fields = source === undefined ? undefined : deckBrackets(source)
    // Empty brackets still open on a title slide, made from the page's `defineMeta`.
    const hasTitle =
      fields !== undefined &&
      (Object.keys(fields.title).length > 0 || Object.keys(fields.deck).length === 0)
    const title = hasTitle ? [element('Deck.Title', fields.title)] : []
    return element('Deck', fields?.deck ?? {}, [...title, ...toSlides(withoutLabel(deck))]) as never
  },
})
