import { deckAnnotators } from '@learning/mdx/brackets'

type Loader = () => Promise<string>

let pages = new Map<string, Loader>()
const cache = new Map<string, Promise<Map<string, string[]>>>()

const normalize = (url: string) => (url.length > 1 ? url.replace(/\/+$/, '') : url)

/**
 * Gives the server the source of every page, by URL, so that it can read who may draw on a deck:
 * a list the browser sends cannot be trusted.
 * The app passes `import.meta.glob(…, { query: '?raw', import: 'default' })` and its route for each file.
 */
export function registerPageSources(
  sources: Record<string, Loader>,
  toPath: (file: string) => string | undefined,
) {
  pages = new Map()
  cache.clear()
  for (const [file, load] of Object.entries(sources)) {
    const path = toPath(file)
    if (path !== undefined) pages.set(normalize(path), load)
  }
}

/** The lowercase emails of who may draw on a deck, `[]` when its page lists none. */
export async function annotatorsOf(url: string, deck: string): Promise<string[]> {
  const key = normalize(url)
  const load = pages.get(key)
  if (!load) return []
  // In development, pages change under the server: read them again every time.
  let decks = import.meta.env?.DEV ? undefined : cache.get(key)
  if (!decks) {
    decks = load().then(deckAnnotators)
    if (!import.meta.env?.DEV) cache.set(key, decks)
  }
  return (await decks).get(deck) ?? []
}
