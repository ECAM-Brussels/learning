import { describe, expect, test } from 'bun:test'
import { evaluate } from 'satteri'
import config from './config'

type Tree = { type: string; [prop: string]: unknown }

const named = (displayName: string) =>
  Object.assign((props: object) => ({ type: displayName, props }), { displayName })
const Deck = Object.assign(named('Deck'), {
  Title: named('Deck.Title'),
  Section: named('Deck.Section'),
  Slide: named('Deck.Slide'),
  Standout: named('Deck.Standout'),
  Stack: named('Deck.Stack'),
  Fragment: named('Deck.Fragment'),
  Notes: named('Deck.Notes'),
  Columns: named('Deck.Columns'),
  Alert: named('Deck.Alert'),
})
const components = { Deck, Latex: named('Latex'), Highlight: named('Highlight') }

/** The tree MDX renders, with components by name and props such as `title` rendered too. */
function render(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(render)
  if (node === null || typeof node !== 'object') return node
  const { type, props = {} } = node as { type: unknown; props?: Record<string, unknown> }
  const name = typeof type === 'string' ? type : (type as { displayName?: string }).displayName
  if (name === undefined) return render((type as (props: object) => unknown)(props))
  return {
    type: name,
    ...Object.fromEntries(Object.entries(props).map(([key, value]) => [key, render(value)])),
  }
}

function compile(source: string) {
  const exports = evaluate(source, {
    features: config.features,
    mdastPlugins: config.mdastPlugins,
    providerImportSource: '@learning/mdx',
    Fragment: 'Fragment',
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
    useMDXComponents: () => components,
  }) as { default: (props: object) => unknown; [name: string]: unknown }
  return { exports, tree: render(exports.default({})) as Tree }
}

const deck = (body: string) => compile(`---\ndeck: true\n---\n\n${body}`).tree
const slides = (body: string) => {
  const tree = deck(body)
  expect(tree.type).toBe('Deck')
  return ([] as Tree[]).concat(tree.children as Tree[]).slice(1)
}
const children = (node: Tree) => ([] as Tree[]).concat((node.children as Tree[] | undefined) ?? [])
const fragment = (...children: unknown[]) => ({
  type: 'Fragment',
  children: children.length === 1 ? children[0] : children,
})

describe('the deck frontmatter', () => {
  test('leaves a page without frontmatter as it is', () => {
    const { tree } = compile('# Titre\n\nTexte')
    expect(JSON.stringify(tree)).not.toContain('Deck')
    expect(children(tree)).toContainEqual({ type: 'h1', children: 'Titre' })
  })

  test('leaves a page as it is when deck is false', () => {
    expect(compile('---\ndeck: false\n---\n\n# Titre').tree).toMatchObject({ type: 'h1' })
  })

  test('makes a page a whole-page deck that opens on its title slide', () => {
    const tree = deck('Texte')
    expect(tree).toMatchObject({ type: 'Deck', page: true })
    expect(children(tree)[0]).toEqual({ type: 'Deck.Title' })
  })

  test('refuses anything else in the frontmatter', () => {
    expect(() => compile('---\ndeck: true\ntitle: Dérivées\n---\n\nTexte')).toThrow(
      /Unexpected frontmatter `title`.*defineMeta/,
    )
  })

  test('refuses a deck that is not true or false', () => {
    expect(() => compile('---\ndeck: yes please\n---\n\nTexte')).toThrow(
      '`deck` should be `true` or `false`',
    )
  })

  test('keeps exports outside the deck, for the slides to use', () => {
    const { exports, tree } = compile(
      '---\ndeck: true\n---\n\nexport const answer = 42\n\n## Réponse\n\n{answer}',
    )
    expect(exports.answer).toBe(42)
    expect(children(tree)[1]).toMatchObject({ type: 'Deck.Slide', children: 42 })
  })
})

describe('slides', () => {
  test('a level 1 heading opens a section, a level 2 heading a slide', () => {
    expect(slides('# Définition\n\n## Taux\n\nTexte')).toEqual([
      {
        type: 'Deck.Stack',
        children: [
          { type: 'Deck.Section', title: fragment('Définition') },
          {
            type: 'Deck.Slide',
            title: fragment('Taux'),
            children: { type: 'p', children: 'Texte' },
          },
        ],
      },
    ])
  })

  test('each section is a stack of its slides', () => {
    expect(slides('A\n\n# Un\n\n## B\n\n---\n\nC\n\n# Deux\n\n## D')).toMatchObject([
      { type: 'Deck.Slide' },
      {
        type: 'Deck.Stack',
        children: [
          { type: 'Deck.Section', title: fragment('Un') },
          { type: 'Deck.Slide', title: fragment('B') },
          { type: 'Deck.Slide', children: { children: 'C' } },
        ],
      },
      {
        type: 'Deck.Stack',
        children: [
          { type: 'Deck.Section', title: fragment('Deux') },
          { type: 'Deck.Slide', title: fragment('D') },
        ],
      },
    ])
  })

  test('a Deck element in a section joins its stack', () => {
    const source = '# Un\n\n## A\n\n<Deck.Standout>Pause</Deck.Standout>\n\n## B'
    expect(slides(source)).toMatchObject([
      {
        type: 'Deck.Stack',
        children: [
          { type: 'Deck.Section' },
          { type: 'Deck.Slide', title: fragment('A') },
          { type: 'Deck.Standout', children: 'Pause' },
          { type: 'Deck.Slide', title: fragment('B') },
        ],
      },
    ])
  })

  test('refuses a stack inside a section', () => {
    expect(() => deck('# Un\n\n<Deck.Stack></Deck.Stack>')).toThrow('A section is already a stack')
  })

  test('a thematic break opens a slide without title', () => {
    expect(slides('## Un\n\nA\n\n---\n\nB')).toEqual([
      { type: 'Deck.Slide', title: fragment('Un'), children: { type: 'p', children: 'A' } },
      { type: 'Deck.Slide', children: { type: 'p', children: 'B' } },
    ])
  })

  test('content before any heading is a slide without title', () => {
    expect(slides('Bonjour\n\n## Un')).toEqual([
      { type: 'Deck.Slide', children: { type: 'p', children: 'Bonjour' } },
      { type: 'Deck.Slide', title: fragment('Un') },
    ])
  })

  test('a Deck element is a slide of its own', () => {
    expect(slides('## Un\n\nA\n\n<Deck.Standout>Questions ?</Deck.Standout>\n\nB')).toEqual([
      { type: 'Deck.Slide', title: fragment('Un'), children: { type: 'p', children: 'A' } },
      { type: 'Deck.Standout', children: 'Questions ?' },
      { type: 'Deck.Slide', children: { type: 'p', children: 'B' } },
    ])
  })

  test('a Deck element within a paragraph stays in its slide', () => {
    expect(slides('## Un\n\nLa <Deck.Alert>clé</Deck.Alert>')).toEqual([
      {
        type: 'Deck.Slide',
        title: fragment('Un'),
        children: { type: 'p', children: ['La ', { type: 'Deck.Alert', children: 'clé' }] },
      },
    ])
  })

  test('deeper headings stay in their slide', () => {
    expect(slides('## Un\n\n### Détail')[0]).toMatchObject({
      children: { type: 'h3', children: 'Détail' },
    })
  })

  test('titles keep their formatting, maths and code', () => {
    const [slide] = slides('## *Vite*, **fort**, ~~faux~~, `code`, $x^2$ et [lien](https://a.b)')
    expect(slide!.title).toEqual(
      fragment(
        { type: 'em', children: 'Vite' },
        ', ',
        { type: 'strong', children: 'fort' },
        ', ',
        { type: 'del', children: 'faux' },
        ', ',
        { type: 'code', children: 'code' },
        ', ',
        { type: 'Latex', value: 'x^2' },
        ' et ',
        { type: 'a', href: 'https://a.b', children: 'lien' },
      ),
    )
  })

  test('titles keep their components and expressions', () => {
    const [slide] = slides('## <Deck.Alert>Clé</Deck.Alert> {1 + 1}')
    expect(slide!.title).toEqual(fragment({ type: 'Deck.Alert', children: 'Clé' }, ' ', 2))
  })

  test('the other plugins still apply inside slides', () => {
    const [slide] = slides('## Un\n\n$$\nx\n$$\n\n```js\nx\n```\n\n:::example\nA\n:::')
    expect(children(slide!)).toMatchObject([
      { type: 'Latex', value: 'x', displayMode: true },
      { type: 'Highlight', lang: 'js', code: 'x' },
      { type: 'div', 'data-type': 'example' },
    ])
  })
})

describe('steps', () => {
  test('what follows a pause appears on the next step', () => {
    expect(children(slides('## Un\n\nA\n\n. . .\n\nB\n\nC')[0]!)).toEqual([
      { type: 'p', children: 'A' },
      {
        type: 'Deck.Fragment',
        as: 'div',
        class: 'space-y-6',
        children: [
          { type: 'p', children: 'B' },
          { type: 'p', children: 'C' },
        ],
      },
    ])
  })

  test('each pause adds a step', () => {
    const [, second] = children(slides('A\n\n. . .\n\nB\n\n. . .\n\nC')[0]!)
    expect(second).toMatchObject({
      type: 'Deck.Fragment',
      children: [
        { type: 'p', children: 'B' },
        { type: 'Deck.Fragment', children: { children: 'C' } },
      ],
    })
  })

  test('incremental lists show one item per step', () => {
    const [slide] = slides(':::incremental\n- A\n- B\n:::\n\n:::incremental\n1. C\n:::')
    expect(children(slide!)).toMatchObject([
      {
        type: 'ul',
        children: [
          { type: 'Deck.Fragment', as: 'li', children: { type: 'p', children: 'A' } },
          { type: 'Deck.Fragment', as: 'li', children: { type: 'p', children: 'B' } },
        ],
      },
      { type: 'ol', children: { type: 'Deck.Fragment', as: 'li' } },
    ])
  })

  test('what is not a list in an incremental block shows at once', () => {
    expect(children(slides(':::incremental\nA\n:::')[0]!)).toEqual([{ type: 'p', children: 'A' }])
  })
})

describe('directives', () => {
  test('notes are speaker notes', () => {
    expect(children(slides('A\n\n:::notes\nRappel\n:::')[0]!)[1]).toEqual({
      type: 'Deck.Notes',
      children: { type: 'p', children: 'Rappel' },
    })
  })

  test('columns lay their columns side by side', () => {
    const column = ':::column\nA\n:::\n'
    const [slide] = slides(`::::columns\n${column.repeat(3)}::::`)
    expect(slide!.children).toEqual({
      type: 'Deck.Columns',
      children: Array(3).fill({ type: 'div', children: { type: 'p', children: 'A' } }),
    })
  })

  test('columns can hold slide directives', () => {
    const [slide] = slides('::::columns\n:::column\n:::::incremental\n- A\n:::::\n:::\n::::')
    expect(slide!.children).toMatchObject({
      type: 'Deck.Columns',
      children: { type: 'div', children: { type: 'ul', children: { type: 'Deck.Fragment' } } },
    })
  })

  test('slide directives mean nothing outside a deck', () => {
    expect(compile(':::notes\nA\n:::').tree).toMatchObject({ type: 'div', 'data-type': 'notes' })
  })
})
