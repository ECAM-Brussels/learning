import generate from '@babel/generator'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import { decrypt, encrypt, expr } from '@learning/core'
import type { Plugin } from 'vite'

export default function buildPlugin(): Plugin {
  return {
    name: 'vite-plugin-dollar-build',

    async transform(code, id) {
      if (!/\.[jt]sx?$/.test(id)) return

      await waitForLocalhost8088()

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      })

      const promises: Promise<void>[] = []

      traverse(ast, {
        CallExpression(path: any) {
          const { callee, arguments: args } = path.node
          if (!t.isIdentifier(callee) || callee.name !== '$') return
          const fn = args[0]
          if (!t.isArrowFunctionExpression(fn) && !t.isFunctionExpression(fn)) return
          const { code: fnCode } = generate(fn)
          const context = { encrypt, decrypt, expr }
          const code = fn.async
            ? `return (async () => await (${fnCode})({${Object.keys(context).join(', ')}}))()`
            : `return (${fnCode})({${Object.keys(context).join(', ')}})`
          const runner = new Function(...Object.keys(context), code)
          const promise = Promise.resolve(runner(...Object.values(context))).then((result) => {
            if (result && typeof result === 'object' && 'json' in result) {
              path.replaceWith(toLiteral(result.json))
            } else {
              path.replaceWith(toLiteral(result))
            }
          })
          promises.push(promise)
        },
      })

      if (promises.length > 0) await Promise.all(promises)
      return { code: generate(ast).code, map: null }
    },
  }
}

function toLiteral(value: any): t.Expression {
  if (value === null) return t.nullLiteral()
  if (typeof value === 'string') return t.stringLiteral(value)
  if (typeof value === 'number') return t.numericLiteral(value)
  if (typeof value === 'boolean') return t.booleanLiteral(value)
  if (Array.isArray(value)) return t.arrayExpression(value.map(toLiteral))
  if (typeof value === 'object') {
    return t.objectExpression(
      Object.entries(value).map(([key, val]) =>
        t.objectProperty(t.stringLiteral(key), toLiteral(val)),
      ),
    )
  }
  throw new Error(`Unsupported value type: ${typeof value}`)
}

let symapiReady: Promise<void> | null = null
function waitForLocalhost8088() {
  if (symapiReady) return symapiReady
  symapiReady = (async () => {
    const url = 'http://localhost:8088/docs'
    while (true) {
      try {
        await fetch(url)
        return
      } catch (e) {
        console.error(`Error connecting to ${url}, retrying in 1 second: ${e}`)
      }
      await new Promise((res) => setTimeout(res, 1000))
    }
  })()
  return symapiReady
}
