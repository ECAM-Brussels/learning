import { describe, expect, test } from 'bun:test'
import { evaluate } from 'satteri'
import { deckAnnotators } from './brackets.ts'
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
const components = {
  Deck,
  Latex: named('Latex'),
  Highlight: named('Highlight'),
}

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

const deck = (body: string) => compile(`:::::deck\n\n${body}\n\n:::::`).tree
const slides = (body: string) => {
  const tree = deck(body)
  expect(tree.type).toBe('Deck')
  return ([] as Tree[]).concat(tree.children as Tree[])
}
const children = (node: Tree) => ([] as Tree[]).concat((node.children as Tree[] | undefined) ?? [])
const fragment = (...children: unknown[]) => ({
  type: 'Fragment',
  children: children.length === 1 ? children[0] : children,
})

describe('the deck directive', () => {
  test('sits in the page like any block, without a title slide', () => {
    const { tree } = compile('Avant\n\n:::::deck\n\n## Un\n\n:::::\n\nAprès')
    expect(children(tree) as unknown[]).toEqual([
      { type: 'p', children: 'Avant' },
      '\n',
      { type: 'Deck', children: { type: 'Deck.Slide', title: fragment('Un') } },
      '\n',
      { type: 'p', children: 'Après' },
    ])
  })

  test('opens on a title slide when its brackets give one', () => {
    const tree = compile(
      ':::::deck[title="Les dérivées" subtitle="Analyse 1"]\n\n## Un\n\n:::::',
    ).tree
    expect(children(tree)).toEqual([
      { type: 'Deck.Title', title: 'Les dérivées', subtitle: 'Analyse 1' },
      { type: 'Deck.Slide', title: fragment('Un') },
    ])
  })

  test("refuses what is not one of the title slide's fields", () => {
    expect(() => compile(':::::deck[title="Rappels" autor="Moi"]\n\n:::::')).toThrow(
      'Unexpected `autor="Moi"` in the deck\'s brackets',
    )
    expect(() => compile(':::::deck[Rappels]\n\n:::::')).toThrow('Unexpected `Rappels`')
  })

  test('passes who may draw on it to the deck, without a title slide unless given one', () => {
    const tree = compile(
      ':::::deck[annotators="a@ecam.be, b@ecam.be" id="td"]\n\n## Un\n\n:::::',
    ).tree
    expect(tree).toMatchObject({ type: 'Deck', annotators: 'a@ecam.be, b@ecam.be', id: 'td' })
    expect(children(tree)).toEqual([{ type: 'Deck.Slide', title: fragment('Un') }])
    const titled = compile(
      ':::::deck[title="Rappels" annotators="a@ecam.be"]\n\n## Un\n\n:::::',
    ).tree
    expect(children(titled)[0]).toEqual({ type: 'Deck.Title', title: 'Rappels' })
  })

  test('refuses attributes in braces', () => {
    expect(() => compile(':::::deck{title="Rappels"}\n\n## Un\n\n:::::')).toThrow('in brackets')
  })

  test("can use the page's exports", () => {
    const { exports, tree } = compile(
      'export const answer = 42\n\n:::::deck\n\n## Réponse\n\n{answer}\n\n:::::',
    )
    expect(exports.answer).toBe(42)
    expect(tree).toMatchObject({ type: 'Deck', children: { type: 'Deck.Slide', children: 42 } })
  })
})

describe('slides', () => {
  test('deeper headings stay in their slide', () => {
    expect(slides('## Un\n\n### Détail')[0]).toMatchObject({
      children: { type: 'h3', children: 'Détail' },
    })
  })

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

describe('deckAnnotators', () => {
  test("reads each deck's annotators from MDX and TSX, by id", () => {
    const source = [
      ':::::deck[title="Cours" annotators="Prof@ecam.be, assistant@ecam.be"]',
      '',
      ':::::',
      '',
      '::::::deck[id="td" annotators="td@ecam.be"]',
      '',
      '::::::',
      '',
      ':::::deck[title="Sans dessin"]',
      '',
      '<Deck id="tsx" class={["a", "b"]} annotators="x@ecam.be y@ecam.be">',
    ].join('\n')
    expect(Object.fromEntries(deckAnnotators(source))).toEqual({
      '': ['prof@ecam.be', 'assistant@ecam.be'],
      td: ['td@ecam.be'],
      tsx: ['x@ecam.be', 'y@ecam.be'],
    })
  })

  test('refuses two drawable decks with the same id', () => {
    const source = ':::::deck[annotators="a@ecam.be"]\n:::::\n:::::deck[annotators="b@ecam.be"]'
    expect(() => deckAnnotators(source)).toThrow('give each its own id')
  })
})
