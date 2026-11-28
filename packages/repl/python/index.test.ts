import { describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import dedent from 'dedent'
import { readFileSync } from 'node:fs'
import { loadPyodide, version } from 'pyodide'
import { createPython, type Options } from '.'
import type { Output, Transport } from '../types'
import { createExecutor, formatError } from './execute'

// Pyodide takes seconds to start; packages it lacks locally, such as numpy, come from its CDN once,
// then from the cache below.
setDefaultTimeout(120_000)

const dualNumbers = readFileSync(new URL('./automatic_diff.py', import.meta.url), 'utf8')
const cdn = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`
// Cached in node_modules: Pyodide would otherwise make a folder named after the CDN's address.
const packageCacheDir = new URL('../node_modules/.cache/pyodide/', import.meta.url).pathname
const load = mock(() => loadPyodide({ packageBaseUrl: cdn, packageCacheDir }))
const execute = createExecutor(load, dualNumbers)

/** Runs the code here rather than in a worker, as the page does. */
const transport: Transport<Options> = (input, onOutput) => {
  void execute(input, onOutput)
  return () => {}
}
const python = createPython(transport)

const statuses = async (code: string) => {
  const seen: Output[] = []
  for await (const output of python.run(code)) seen.push(output)
  return seen
}

describe('run', () => {
  test('reports each step, then the result and what was printed, and ends', async () => {
    const outputs = await statuses('print("Bonjour")\n6 * 7')
    expect(outputs.map((output) => output.status)).toEqual([
      'loading',
      'importing',
      'executing',
      'done',
    ])
    expect(outputs.at(-1)).toMatchObject({ result: '42', stdout: 'Bonjour\n' })
    expect(new Set(outputs.map((output) => output.id)).size).toBe(1)
  })

  test('gives an empty result for empty code, without running it', async () => {
    expect(await statuses('')).toMatchObject([{ status: 'done', result: '', stdout: '' }])
  })

  test('starts every run afresh: names of a previous run are gone', async () => {
    await python.output('secret = 42')
    expect((await python.output('secret')).error).toContain(
      "NameError: name 'secret' is not defined",
    )
  })

  test("runs concurrent code one after the other, so that one can't see the other's names", async () => {
    const [model, student] = await Promise.all([
      python.output('def answer():\n    return 42\nanswer()', { math: true }),
      python.output('answer()', { math: true }),
    ])
    expect(model.result).toBe('42')
    expect(student.error).toContain("NameError: name 'answer' is not defined")
  })
})

describe('errors', () => {
  test('show only the frames of the code, each with its line', async () => {
    const { error } = await python.output('def inverse(n):\n    return 1 / n\n\ninverse(0)')
    expect(error).toBe(
      dedent`
        Traceback (most recent call last):
          File "<exec>", line 4, in <module>
            inverse(0)
          File "<exec>", line 2, in inverse
            return 1 / n
        ZeroDivisionError: division by zero
      `,
    )
  })

  test('show a syntax error with its line and caret', async () => {
    const { error } = await python.output('x = 1\ndef f(:\n    pass')
    expect(error).not.toContain('_pyodide')
    expect(error).toContain('File "<exec>", line 2')
    expect(error).toContain('def f(:')
    expect(error).toContain('^')
    expect(error).toEndWith('SyntaxError: invalid syntax')
  })

  test('leave a message without a traceback as it is', () => {
    expect(formatError(new Error('No module named foo'), '')).toBe('No module named foo')
  })

  test('a failed load is reported, and tried again on the next run', async () => {
    const failing = createExecutor(async () => {
      throw new Error('Network error')
    }, dualNumbers)
    const outputs: Output[] = []
    await failing({ id: '1', code: '1' }, (output) => outputs.push(output))
    expect(outputs).toEqual([
      { id: '1', status: 'loading' },
      { id: '1', status: 'done', error: 'Network error' },
    ])

    let attempts = 0
    const flaky = createExecutor(() => {
      attempts++
      return attempts === 1 ? Promise.reject(new Error('Network error')) : load()
    }, dualNumbers)
    await flaky({ id: 'a', code: '1' }, () => {})
    const done: Output[] = []
    await flaky({ id: 'b', code: '1 + 1' }, (output) => done.push(output))
    expect(done.at(-1)).toMatchObject({ result: '2' })
    expect(attempts).toBe(2)
  })
})

describe('math', () => {
  test('dual numbers give derivatives, also through numpy', async () => {
    const run = (code: string) => python.output(code, { math: true })
    expect((await run('f = lambda x: x**3\nf(2 + epsilon).dual')).result).toBe('12')
    expect((await run('import numpy as np\nfloat(np.sin(0 + epsilon).dual)')).result).toBe('1')
    expect((await run('(1 + 2 * epsilon) * (3 + epsilon)')).result).toBe('3 + 7.0ε')
  })

  test('shows a result with a LaTeX form as LaTeX', async () => {
    const out = await python.output(
      dedent`
        class Square:
            def _repr_latex_(self):
                return "$x^2$"
        Square()
      `,
      { math: true },
    )
    expect(out).toMatchObject({ result: 'x^2', format: 'latex' })
  })

  test('shows a Matplotlib figure as an image, except in tests', async () => {
    const plot = 'import matplotlib.pyplot as plt\nplt.plot([0, 1], [0, 1])\nNone'
    expect(await python.output(plot, { math: true })).toMatchObject({ format: 'image' })
    expect((await python.output(plot, { math: true })).result).toStartWith('data:image/png;base64,')
    expect((await python.output(plot, { math: true, test: true })).format).toBeUndefined()
  })
})

describe('expect', () => {
  const square = 'def carre(x):\n    return x * x'

  test('toReturn compares the value: True is true, 4.0 is 4, and 0.1 + 0.2 is 0.3', async () => {
    const check = python.expect(square)
    expect(await check.with('carre(3)').toReturn(9)()).toBe(true)
    expect(await check.with('carre(2.0)').toReturn(4)()).toBe(true)
    expect(await check.with('carre(3)').toReturn(10)()).toBe(false)
    expect(await check.with('carre(2) == 4').toReturn(true)()).toBe(true)
    expect(await python.expect('0.1 + 0.2').toReturn(0.3)()).toBe(true)
    expect(await python.expect('"bonjour"').toReturn("'bonjour'")()).toBe(false)
    expect(await python.expect('"bonjour"').toReturn('bonjour')()).toBe(true)
  })

  test('stdout and toPrint check what was printed, not the result', async () => {
    const code = 'print("Bonjour")\n42'
    expect(await python.expect(code).stdout().toBe('Bonjour')()).toBe(true)
    expect(await python.expect(code).toPrint('Bonjour')()).toBe(true)
    expect(await python.expect(code).toPrint(42)()).toBe(false)
    expect(
      await python
        .expect(code)
        .stdout()
        .toMatch(/bonjour/i)(),
    ).toBe(true)
  })

  test('output() accepts the answer returned or printed, also after other lines', async () => {
    const returned = 'def f(x):\n    return 2 * x\nf(21)'
    const printed = 'def f(x):\n    return 2 * x\nprint(f(21))'
    const explained = 'print("Calcul de f(21)")\nprint(42)'
    for (const code of [returned, printed, explained]) {
      expect(await python.expect(code).output().toBe(42)()).toBe(true)
      expect(await python.expect(code).output().toEqualThatOf('2 * 21')()).toBe(true)
    }
    expect(await python.expect('print(41)').output().toBe(42)()).toBe(false)
    expect(await python.expect('print(41)').not().output().toBe(42)()).toBe(true)
    expect(await python.expect('x = 1').output().toBe(42)()).toBe(false)
    // result() still asks for the value itself.
    expect(await python.expect(printed).result().toEqualThatOf('2 * 21')()).toBe(false)
  })

  test('output() compares with what the model answer printed, if it returns nothing', async () => {
    const model = 'print(sum(range(5)))'
    expect(await python.expect('10').output().toEqualThatOf(model)()).toBe(true)
    expect(await python.expect('print(10)').output().toEqualThatOf(model)()).toBe(true)
    expect(await python.expect('print(9)').output().toEqualThatOf(model)()).toBe(false)
    expect(await python.expect('print(10.0004)').output().toEqualThatOf(model, 1e-3)()).toBe(true)
  })

  test('code checks read the code without running it', async () => {
    const loop = 'total = 0\nfor i in range(3):\n    total += i'
    expect(await python.expect(loop).code.toMatch(/for /)()).toBe(true)
    expect(await python.expect(loop).code.not.toMatch(/while /)()).toBe(true)
    expect(await python.expect(loop).code.toSatisfy((code) => code.includes('range'))()).toBe(true)
  })

  test('not() turns any check around, including when nothing was output', async () => {
    expect(await python.expect('1').not().toError()()).toBe(true)
    expect(await python.expect('1 / 0').toError()()).toBe(true)
    expect(await python.expect('1').not().error().toMatch(/Error/)()).toBe(true)
    expect(
      await python
        .expect('1 / 0')
        .error()
        .toMatch(/ZeroDivisionError/)(),
    ).toBe(true)
    expect(await python.expect('1').not().toReturn(2)()).toBe(true)
  })

  test("toEqualThatOf compares with the model answer's result, within a tolerance if given", async () => {
    const student = 'import math\nmath.sqrt(2)'
    expect(await python.expect(student).result().toEqualThatOf('2 ** 0.5')()).toBe(true)
    expect(await python.expect('1.4142').result().toEqualThatOf('2 ** 0.5', 1e-3)()).toBe(true)
    expect(await python.expect('1.4142').result().toEqualThatOf('2 ** 0.5', 1e-6)()).toBe(false)
  })

  test('matplotlib checks read the figure the code drew', async () => {
    const code = dedent`
      import matplotlib.pyplot as plt
      import numpy as np
      x = np.linspace(-3, 3, 100)
      plt.plot(x, np.sin(x))
      plt.xlabel("x")
      plt.ylabel("sin x")
      plt.title("Sinus")
      plt.grid()
    `
    const check = python.expect(code, { math: true })
    expect(await check.matplotlib.plot('np.sin(x)', -3, 3)()).toBe(true)
    expect(await check.matplotlib.plot('np.cos(x)', -3, 3)()).toBe(false)
    expect(await check.matplotlib.xLabel().toMatch(/x/)()).toBe(true)
    expect(await check.matplotlib.yLabel().toBe('sin x')()).toBe(true)
    expect(await check.matplotlib.title().toMatch(/sinus/i)()).toBe(true)
    expect(await check.matplotlib.grid()()).toBe(true)
    expect(await check.matplotlib.lineCount().toBe(1)()).toBe(true)
  })

  test("a figure from a previous run doesn't leak into the next", async () => {
    await python.output('import matplotlib.pyplot as plt\nplt.plot([0, 1], [0, 1])\nNone', {
      math: true,
      test: true,
    })
    const figures = python.expect('import matplotlib.pyplot as plt', { math: true })
    expect(await figures.with('len(plt.get_fignums())').toReturn(0)()).toBe(true)
  })
})
