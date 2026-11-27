// Kept apart from deck.ts, which needs satteri: the server reads decks' annotators with these.

const titleFields = ['title', 'subtitle', 'author', 'institute', 'date']
/** Fields of a deck's brackets that configure the deck rather than its title slide. */
const deckFields = ['annotators', 'id']

/**
 * The `key="value"` fields in a deck's brackets:
 * those of its title slide, and the deck's own (`annotators`, `id`).
 */
export function deckBrackets(source: string) {
  const pair = /\s*([a-z]+)="([^"]*)"\s*/y
  const title: Record<string, string> = {}
  const deck: { annotators?: string; id?: string } = {}
  while (pair.lastIndex < source.length) {
    const start = pair.lastIndex
    const match = pair.exec(source)
    const [, field, value] = match ?? []
    if (field && titleFields.includes(field)) title[field] = value!
    else if (field && deckFields.includes(field)) deck[field as keyof typeof deck] = value!
    else {
      throw new Error(
        `Unexpected \`${source.slice(start).trim()}\` in the deck's brackets: ` +
          `write its title slide as ${titleFields.map((name) => `${name}="…"`).join(', ')}, ` +
          `and who may draw on it as annotators="…"`,
      )
    }
  }
  return { title, deck }
}

/** Splits a list of emails, such as a deck's `annotators`, written with commas or spaces. */
export const emails = (list: string) =>
  list
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((email) => email.toLowerCase())

/**
 * The decks a page's source declares annotators for, by deck id (`''` without one):
 * `:::::deck[annotators="…"]` in MDX, `<Deck annotators="…">` in TSX.
 * The server reads them from the source, as it cannot trust a list sent by the browser.
 */
export function deckAnnotators(source: string): Map<string, string[]> {
  const decks = new Map<string, string[]>()
  const add = (id = '', annotators?: string) => {
    if (annotators === undefined) return
    if (decks.has(id)) {
      throw new Error(`Two decks on one page draw with id="${id}": give each its own id="…"`)
    }
    decks.set(id, emails(annotators))
  }
  for (const [, brackets] of source.matchAll(/^:{3,}deck\[(.*)\][ \t]*$/gm)) {
    const { deck } = deckBrackets(brackets!)
    add(deck.id, deck.annotators)
  }
  for (const [, attributes] of source.matchAll(/<Deck\b((?:[^>{]|\{[^}]*\})*)>/g)) {
    const attribute = (name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(attributes!)?.[1]
    add(attribute('id'), attribute('annotators'))
  }
  return decks
}
