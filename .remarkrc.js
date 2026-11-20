// Markdown syntax extensions used by the MDX content (see packages/mdx/config.ts).
// eslint-plugin-mdx reads this file so that it parses MDX the same way the site does:
// without remark-math, braces in $\frac{a}{b}$ would be parsed as JSX expressions.

const directiveTypes = new Set(['containerDirective', 'leafDirective', 'textDirective'])

/**
 * Replaces directive nodes (:::exercise ... :::) with their children.
 * eslint-mdx does not descend into directives, so JSX and expressions inside them
 * would be invisible to ESLint and their imports reported as unused.
 */
function unwrapDirectives() {
  const unwrap = (node) => {
    if (!('children' in node)) return
    node.children = node.children.flatMap((child) => {
      unwrap(child)
      return directiveTypes.has(child.type) ? child.children : [child]
    })
  }
  const data = this.data()
  ;(data.fromMarkdownExtensions ??= []).push({ transforms: [unwrap] })
}

export default {
  plugins: ['remark-gfm', 'remark-math', 'remark-directive', unwrapDirectives],
}
