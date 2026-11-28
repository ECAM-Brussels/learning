import { describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import dedent from 'dedent'
import { readFileSync } from 'node:fs'
import { loadPyodide, version } from 'pyodide'
import { createPython, type Options } from '.'
import type { Output, Transport } from '../types'
import { createExecutor, formatError } from './execute'
import type { Check } from './expect'

// Pyodide takes seconds to start; packages it lacks locally, such as numpy, come from its CDN once,
// then from the cache below.
setDefaultTimeout(120_000)

const helpers = {
  dualNumbers: readFileSync(new URL('./automatic_diff.py', import.meta.url), 'utf8'),
  checks: readFileSync(new URL('./checks.py', import.meta.url), 'utf8'),
}
const cdn = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`
// Cached in node_modules: Pyodide would otherwise make a folder named after the CDN's address.
const packageCacheDir = new URL('../node_modules/.cache/pyodide/', import.meta.url).pathname
const load = mock(() => loadPyodide({ packageBaseUrl: cdn, packageCacheDir }))
const execute = createExecutor(load, helpers)

/** Runs the code here rather than in a worker, as the page does. */
const transport: Transport<Options> = (input, onOutput) => {
  void execute(input, onOutput)
  return () => {}
}
const python = createPython(transport)

/** Whether a check passes: older checks answer with a boolean, newer ones with a verdict. */
const passes = async (check: Check) => {
  const result = await check()
  return typeof result === 'boolean' ? result : result.passed
}

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
    }, helpers)
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
    }, helpers)
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

  test('toReturn compares the value: True is true, numbers up to a relative error of 1e-9', async () => {
    const check = python.expect(square)
    expect(await passes(check.with('carre(3)').toReturn(9))).toBe(true)
    expect(await passes(check.with('carre(2.0)').toReturn(4))).toBe(true)
    expect(await passes(check.with('carre(3)').toReturn(10))).toBe(false)
    expect(await passes(check.with('carre(2) == 4').toReturn(true))).toBe(true)
    expect(await passes(python.expect('0.1 + 0.2').toReturn(0.3))).toBe(true)
    expect(await passes(python.expect('1e-17').toReturn(0))).toBe(false)
    expect(await passes(python.expect('"bonjour"').toReturn("'bonjour'"))).toBe(false)
    expect(await passes(python.expect('"bonjour"').toReturn('bonjour'))).toBe(true)
  })

  test('an error can only be given with a number', () => {
    const check = python.expect('1')
    check.result().toBe(1, 0.5)
    check.toReturn(1, 0.5)
    // @ts-expect-error a text has no error
    check.result().toBe('1', 0.5)
    // @ts-expect-error a boolean has no error
    check.toReturn(true, 0)
    const answer: number | string = 1 as number | string
    // Unknown until it runs, as in the Calculator exercise: allowed.
    check.result().toBe(answer, 0)
  })

  test('an error given is absolute: within it, a number is the expected one', async () => {
    expect(await passes(python.expect('3.14').toReturn(Math.PI, 0.01))).toBe(true)
    expect(await passes(python.expect('3.1').toReturn(Math.PI, 0.01))).toBe(false)
  })

  // As in the Calculator exercise of MN1M/01-python, which teaches how floats are rounded.
  test('with an error of 0, a float is the one Python computes, not the number it should be', async () => {
    const answer = (code: string, expected: number) =>
      python.expect(code).result().toBe(expected, 0)()
    expect(await answer('0.1 * 0.1', 0.1 * 0.1)).toBe(true)
    expect(await answer('0.01', 0.1 * 0.1)).toBe(false)
    expect(await answer('0.1 + 0.1 + 0.1 - 0.3', 0.1 + 0.1 + 0.1 - 0.3)).toBe(true)
    expect(await answer('0', 0.1 + 0.1 + 0.1 - 0.3)).toBe(false)
    expect(await answer('5 ** (1 / 3)', 5 ** (1 / 3))).toBe(true)
    // By default, the rounding Python does is forgiven.
    expect(
      await python
        .expect('0.01')
        .result()
        .toBe(0.1 * 0.1)(),
    ).toBe(true)
  })

  test('stdout and toPrint check what was printed, not the result', async () => {
    const code = 'print("Bonjour")\n42'
    expect(await passes(python.expect(code).stdout().toBe('Bonjour'))).toBe(true)
    expect(await passes(python.expect(code).toPrint('Bonjour'))).toBe(true)
    expect(await passes(python.expect(code).toPrint(42))).toBe(false)
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
      expect(await passes(python.expect(code).output().toBe(42))).toBe(true)
      expect(await passes(python.expect(code).output().toEqualThatOf('2 * 21'))).toBe(true)
    }
    expect(await passes(python.expect('print(41)').output().toBe(42))).toBe(false)
    expect(await passes(python.expect('print(41)').not().output().toBe(42))).toBe(true)
    expect(await passes(python.expect('x = 1').output().toBe(42))).toBe(false)
    // result() still asks for the value itself.
    expect(await passes(python.expect(printed).result().toEqualThatOf('2 * 21'))).toBe(false)
  })

  test('toShow accepts the value returned or printed, numbers within an error', async () => {
    for (const code of ['6 * 7', 'print(6 * 7)', 'print("Calcul")\nprint(42.0)']) {
      expect(await passes(python.expect(code).toShow(42))).toBe(true)
    }
    expect(await passes(python.expect('print(41)').toShow(42))).toBe(false)
    expect(await passes(python.expect('print(3.14)').toShow(Math.PI, 0.01))).toBe(true)
    expect(await passes(python.expect('print(0.01)').toShow(0.1 * 0.1, 0))).toBe(false)
    expect(await passes(python.expect('print("Bonjour")').toShow('Bonjour'))).toBe(true)
    // @ts-expect-error a text has no error
    python.expect('1').toShow('1', 0.5)
  })

  test('output() compares with what the model answer printed, if it returns nothing', async () => {
    const model = 'print(sum(range(5)))'
    expect(await passes(python.expect('10').output().toEqualThatOf(model))).toBe(true)
    expect(await passes(python.expect('print(10)').output().toEqualThatOf(model))).toBe(true)
    expect(await passes(python.expect('print(9)').output().toEqualThatOf(model))).toBe(false)
    expect(await passes(python.expect('print(10.0004)').output().toEqualThatOf(model, 1e-3))).toBe(
      true,
    )
  })

  test('code checks read the code without running it', async () => {
    const loop = 'total = 0\nfor i in range(3):\n    total += i'
    expect(await passes(python.expect(loop).code.toMatch(/for /))).toBe(true)
    expect(await passes(python.expect(loop).code.not.toMatch(/while /))).toBe(true)
    expect(await passes(python.expect(loop).code.toSatisfy((code) => code.includes('range')))).toBe(
      true,
    )
  })

  test('not() turns any check around, including when nothing was output', async () => {
    expect(await passes(python.expect('1').not().toError())).toBe(true)
    expect(await passes(python.expect('1 / 0').toError())).toBe(true)
    expect(await passes(python.expect('1').not().error().toMatch(/Error/))).toBe(true)
    expect(
      await python
        .expect('1 / 0')
        .error()
        .toMatch(/ZeroDivisionError/)(),
    ).toBe(true)
    expect(await passes(python.expect('1').not().toReturn(2))).toBe(true)
  })

  test("toEqualThatOf compares with the model answer's result, within a tolerance if given", async () => {
    const student = 'import math\nmath.sqrt(2)'
    expect(await passes(python.expect(student).result().toEqualThatOf('2 ** 0.5'))).toBe(true)
    expect(await passes(python.expect('1.4142').result().toEqualThatOf('2 ** 0.5', 1e-3))).toBe(
      true,
    )
    expect(await passes(python.expect('1.4142').result().toEqualThatOf('2 ** 0.5', 1e-6))).toBe(
      false,
    )
    expect(await passes(python.expect('0.1 + 0.2').result().toEqualThatOf('0.3'))).toBe(true)
    expect(await passes(python.expect('0.1 + 0.2').result().toEqualThatOf('0.3', 0))).toBe(false)
    expect(await passes(python.expect('[1, 2]').result().toEqualThatOf('[1, 2]'))).toBe(true)
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
    expect(await passes(check.matplotlib.plot('np.sin(x)', -3, 3))).toBe(true)
    expect(await passes(check.matplotlib.plot('np.cos(x)', -3, 3))).toBe(false)
    expect(await passes(check.matplotlib.xLabel().toMatch(/x/))).toBe(true)
    expect(await passes(check.matplotlib.yLabel().toBe('sin x'))).toBe(true)
    expect(await passes(check.matplotlib.title().toMatch(/sinus/i))).toBe(true)
    expect(await passes(check.matplotlib.grid())).toBe(true)
    expect(await passes(check.matplotlib.lineCount().toBe(1))).toBe(true)
  })

  test('a check that fails midway leaves no curve behind for the next run', async () => {
    const code = 'import matplotlib.pyplot as plt\nplt.plot([0, 1], [0, 1])\nNone'
    const check = python.expect(code, { math: true })
    // Fails before its plt.close("all"): the figure it read stays open.
    expect(await passes(check.with('raise ValueError("check failed")').toReturn(true))).toBe(false)
    expect(await passes(check.matplotlib.lineCount().toBe(1))).toBe(true)
  })

  test("a figure from a previous run doesn't leak into the next", async () => {
    await python.output('import matplotlib.pyplot as plt\nplt.plot([0, 1], [0, 1])\nNone', {
      math: true,
      test: true,
    })
    const figures = python.expect('import matplotlib.pyplot as plt', { math: true })
    expect(await passes(figures.with('len(plt.get_fignums())').toReturn(0))).toBe(true)
  })
})

/** The verdict of a check: a boolean answer is a verdict without a message. */
const verdictOf = async (check: Check) => {
  const result = await check()
  return typeof result === 'boolean' ? { passed: result } : result
}

describe('input', () => {
  const greet = 'name = input("Nom ? ")\nprint("Bonjour", name)'

  test('reads the lines given, in order, as a terminal shows them', async () => {
    const out = await python.output(greet, { stdin: ['Alice'] })
    expect(out.stdout).toBe('Nom ? Alice\nBonjour Alice\n')
  })

  test('asking for more lines than given is an error, not a wait', async () => {
    const { error } = await python.output(greet)
    expect(error).toEndWith("EOFError: le programme demande plus d'entrées que celles données")
    expect(error).not.toContain('input.py')
  })

  test('withInput gives the lines to the checks, also to the model answer', async () => {
    const sum = 'a = int(input())\nb = int(input())\nprint(a + b)'
    expect(await passes(python.expect(sum).withInput('3', '4').toShow(7))).toBe(true)
    expect(await passes(python.expect(greet).withInput('Alice').toShow('Bonjour Alice'))).toBe(true)
    expect(
      await passes(
        python
          .expect(greet)
          .withInput('Alice')
          .stdout()
          .toMatch(/Bonjour Alice/),
      ),
    ).toBe(true)
    const model = 'a = int(input())\nb = int(input())\na + b'
    expect(await passes(python.expect(sum).withInput('3', '4').output().toEqualThatOf(model))).toBe(
      true,
    )
    const positive = 'n = int(input())\nif n < 0:\n    raise ValueError("négatif")'
    expect(await passes(python.expect(positive).withInput('-5').toRaise('ValueError'))).toBe(true)
  })
})

describe('comparing values', () => {
  test('toEqual compares Python values: numbers within an error, lists, dicts, sets, arrays', async () => {
    const equal = (code: string, expected: string, error?: number) =>
      passes(python.expect(code).toEqual(expected, error))
    expect(await equal('[1, 2.00001, 3]', '[1, 2, 3]')).toBe(false)
    expect(await equal('[1, 2.0000000000001, 3]', '[1, 2, 3]')).toBe(true)
    expect(await equal('[1, 2.01, 3]', '[1, 2, 3]', 0.1)).toBe(true)
    expect(await equal('{"b": 2, "a": 1}', '{"a": 1, "b": 2}')).toBe(true)
    expect(await equal('{3, 1, 2}', '{1, 2, 3}')).toBe(true)
    expect(
      await equal('import numpy as np\nnp.array([1, 2, 3])', 'np.array([1.0, 2.0, 3.0])'),
    ).toBe(true)
    expect(await equal('import numpy as np\nnp.array([1, 2])', 'np.array([1, 2, 3])')).toBe(false)
    expect(await equal('True', '1')).toBe(false)
  })

  test('result().toEqualThatOf compares values, so formatting and long arrays no longer mislead', async () => {
    const check = (code: string, model: string) =>
      passes(python.expect(code, { math: true }).result().toEqualThatOf(model))
    expect(await check('import numpy as np\nnp.array([1, 2, 3])', '[1, 2, 3]')).toBe(true)
    const long = 'import numpy as np\nv = np.arange(2000.0)\n'
    expect(await check(`${long}v[1000] = -1\nv`, `${long}v`)).toBe(false)
    // As before: a number given as text is still that number.
    expect(await check('"2"', '2')).toBe(true)
  })

  test('output().toEqualThatOf accepts an array printed as Python writes it', async () => {
    const model = 'import numpy as np\nnp.array([1, 2]) * 2'
    const check = (code: string) => passes(python.expect(code).output().toEqualThatOf(model))
    expect(await check('import numpy as np\nprint(np.array([1, 2]) * 2)')).toBe(true)
    expect(await check('import numpy as np\nprint(np.array([1, 2]) * 3)')).toBe(false)
  })

  test('a failed comparison says what the code gave', async () => {
    expect(await verdictOf(python.expect('[1, 2]').toEqual('[1, 2, 3]'))).toEqual({
      passed: false,
      message: 'le résultat est [1, 2], au lieu de [1, 2, 3]',
    })
    expect(await verdictOf(python.expect('print(42)').result().toEqualThatOf('42'))).toEqual({
      passed: false,
      message: "le code affiche '42' au lieu de donner sa valeur en dernière ligne",
    })
  })

  test('model answers find the dual numbers, as they do on their own', async () => {
    const student = 'def derivee(f, x):\n    return f(x + epsilon).dual\nderivee(lambda x: x**2, 3)'
    const check = python
      .expect(student, { math: true })
      .result()
      .toEqualThatOf('(3 + epsilon).real * 2')
    expect(await passes(check)).toBe(true)
  })
})

describe('functions', () => {
  const model = 'def moyenne(l):\n    return sum(l) / len(l)'
  const calls = [[[2, 4, 6]], [[5]], [[-1, 1]]]

  test('toBehaveLike calls the function on each input, as the model answer', async () => {
    const check = (code: string) =>
      verdictOf(python.expect(code).function('moyenne').toBehaveLike(model, calls))
    expect(
      await check(
        'def moyenne(l):\n    total = 0\n    for x in l:\n        total += x\n    return total / len(l)',
      ),
    ).toEqual({
      passed: true,
    })
    expect(await check('def moyenne(l):\n    return max(l)')).toEqual({
      passed: false,
      message: 'moyenne([2, 4, 6]) renvoie 6, au lieu de 4.0',
    })
    // Integer and float results that are equal count as equal.
    expect(await check('def moyenne(l):\n    return sum(l) // len(l)')).toEqual({ passed: true })
  })

  test('says when the function prints its answer, raises, or is missing', async () => {
    const check = (code: string) =>
      verdictOf(python.expect(code).function('moyenne').toBehaveLike(model, calls))
    expect((await check('def moyenne(l):\n    print(sum(l) / len(l))')).message).toBe(
      "moyenne([2, 4, 6]) affiche '4.0' au lieu de le renvoyer avec return",
    )
    expect((await check('def moyenne(l):\n    return sum(l) / 0')).message).toBe(
      'moyenne([2, 4, 6]) provoque ZeroDivisionError: division by zero',
    )
    expect(await check('x = 1')).toEqual({
      passed: false,
      message: "la fonction moyenne n'est pas définie",
    })
  })

  test('arguments can be Python source, such as arrays', async () => {
    const norm = 'import numpy as np\ndef norme(v):\n    return np.sqrt(np.sum(v ** 2))'
    const check = python
      .expect(norm)
      .function('norme')
      .toBehaveLike('import numpy as np\ndef norme(v):\n    return np.linalg.norm(v)', [
        'np.array([3, 4])',
        'np.array([1, 1])',
      ])
    expect(await passes(check)).toBe(true)
    expect(await passes(python.expect(norm).function('norme').toExist())).toBe(true)
    expect(await passes(python.expect('norme = 3').function('norme').toExist())).toBe(false)
  })

  test("an error in the student's code shows their code, not the checks", async () => {
    const { message } = await verdictOf(
      python.expect('def moyenne(l):\n    return 1\nundefined_name').function('moyenne').toExist(),
    )
    expect(message).toContain('File "<exec>", line 3')
    expect(message).toContain("NameError: name 'undefined_name' is not defined")
    expect(message).not.toContain('checks.py')
  })
})

describe('toRaise', () => {
  test('checks the exception raised, and says which one was', async () => {
    const root =
      'import math\ndef racine(x):\n    if x < 0:\n        raise ValueError("négatif")\n    return math.sqrt(x)'
    expect(await passes(python.expect(root).with('racine(-1)').toRaise('ValueError'))).toBe(true)
    expect(await passes(python.expect(root).with('racine(-1)').toRaise())).toBe(true)
    expect(await verdictOf(python.expect(root).with('racine(4)').toRaise('ValueError'))).toEqual({
      passed: false,
      message: "aucune erreur n'est levée, au lieu de ValueError",
    })
    expect(await verdictOf(python.expect('1 / 0').toRaise('ValueError'))).toEqual({
      passed: false,
      message: 'ZeroDivisionError est levée, au lieu de ValueError',
    })
  })
})

describe('code', () => {
  const code = dedent`
    # sum(range(10)) would be shorter
    from numpy.linalg import solve
    import numpy as np
    total = 0
    squares = [i * i for i in range(10)]
    def carre(x):
        return x * x
  `

  test('toCall reads calls, not comments or strings', async () => {
    const check = python.expect(code)
    expect(await passes(check.code.toCall('sum'))).toBe(false)
    expect(await passes(check.code.not.toCall('sum'))).toBe(true)
    expect(await passes(check.code.toCall('range'))).toBe(true)
    expect(await passes(python.expect(`${code}\nsolve(A, b)`).code.toCall('np.linalg.solve'))).toBe(
      true,
    )
    expect(await passes(python.expect('np.sum(x)').code.toCall('sum'))).toBe(false)
  })

  test('toUse, toImport and toDefine read the syntax', async () => {
    const check = python.expect(code)
    expect(await passes(check.code.toUse('for'))).toBe(true)
    expect(await passes(check.code.toUse('while'))).toBe(false)
    expect(await passes(check.code.toImport('numpy'))).toBe(true)
    expect(await passes(check.code.toImport('math'))).toBe(false)
    expect(await passes(check.code.toDefine('carre'))).toBe(true)
    expect(await passes(check.code.toDefine('total'))).toBe(true)
    expect(await passes(check.not().code.toDefine('cube'))).toBe(true)
    expect(await verdictOf(python.expect('def f(:').code.toUse('def'))).toEqual({
      passed: false,
      message: 'le code contient une erreur de syntaxe',
    })
  })
})

describe('plots', () => {
  const sine = dedent`
    import matplotlib.pyplot as plt
    import numpy as np
    fig, (left, right) = plt.subplots(1, 2)
    x = np.linspace(-3, 3, 30)
    right.plot(x, np.sin(x), label="sinus")
    right.legend()
    left.scatter([3, 1, 2], [9, 1, 4])
    left.set_yscale("log")
  `
  const check = python.expect(sine, { math: true })

  test('plot finds the curve on any axes, with options for points and axes', async () => {
    expect(await passes(check.matplotlib.plot('np.sin(x)', -3, 3))).toBe(false)
    expect(await passes(check.matplotlib.plot('np.sin(x)', -3, 3, { points: 30 }))).toBe(true)
    expect(await passes(check.matplotlib.plot('np.sin(x)', -3, 3, { points: 30, axes: 0 }))).toBe(
      false,
    )
    expect(await verdictOf(check.matplotlib.plot('np.sin(x)', -3, 3))).toEqual({
      passed: false,
      message: "une courbe n'a que 30 points, au lieu d'au moins 41",
    })
    expect(
      (await verdictOf(check.matplotlib.plot('np.cos(x)', -3, 3, { points: 30 }))).message,
    ).toBe('une courbe ne correspond pas à np.cos(x)')
    expect(
      (await verdictOf(check.matplotlib.plot('np.sin(x)', 0, 3, { points: 30 }))).message,
    ).toBe('une courbe va de x = -3 à 3, au lieu de 0 à 3')
  })

  test('scatter, legend, scales and axes', async () => {
    expect(await passes(check.matplotlib.scatter([1, 2, 3], [1, 4, 9]))).toBe(true)
    expect(await passes(check.matplotlib.scatter('[1, 2, 3]', '[1, 4, 8]'))).toBe(false)
    expect(await passes(check.matplotlib.legend(1).toMatch(/sinus/))).toBe(true)
    expect(await passes(check.matplotlib.yScale(0).toBe('log'))).toBe(true)
    expect(await passes(check.matplotlib.axesCount().toBe(2))).toBe(true)
    expect(
      await verdictOf(python.expect('x = 1', { math: true }).matplotlib.plot('x', 0, 1)),
    ).toEqual({
      passed: false,
      message: "aucune courbe n'a été tracée",
    })
  })
})

describe('helpers', () => {
  test("frames of the dual numbers don't show in a student's traceback", async () => {
    const { error } = await python.output('x = 1\nDual(1, 2) / 0', { math: true })
    expect(error).toContain('File "<exec>", line 2')
    expect(error).not.toContain('automatic_diff.py')
    expect(error).not.toContain('x = 1\n')
  })
})

describe('timeout', () => {
  /**
   * A worker that runs one thing at a time, as Pyodide does: the first worker starts only the first run it
   * is sent, which never ends; later workers start and finish every 'quick' run.
   */
  class FakeWorker extends EventTarget {
    static made: FakeWorker[] = []
    terminated = false
    received = 0
    constructor() {
      super()
      FakeWorker.made.push(this)
    }
    postMessage(input: { id: string; code: string }) {
      const first = this === FakeWorker.made[0]
      if (first && this.received++ > 0) return
      const send = (data: object) => this.dispatchEvent(new MessageEvent('message', { data }))
      queueMicrotask(() => {
        if (this.terminated) return
        send({ id: input.id, status: 'executing' })
        if (!first && input.code === 'quick') send({ id: input.id, status: 'done', result: 'ok' })
      })
    }
    terminate() {
      this.terminated = true
    }
  }

  test('stops code that runs too long, and starts what was waiting in a new worker', async () => {
    const { createWorkerTransport, stream } = await import('../transport')
    const transport = createWorkerTransport<Options>(() => new FakeWorker() as unknown as Worker, {
      timeout: () => 50,
      timeoutError: (milliseconds) => `stopped after ${milliseconds} ms`,
    })
    const last = async (code: string) => {
      let final: Output | undefined
      for await (const output of stream(transport, code)) final = output
      return final
    }
    // The waiting run finishes only if it is sent again, to the new worker.
    const [loop, waiting] = await Promise.all([last('while True: pass'), last('quick')])
    expect(loop).toMatchObject({ status: 'done', error: 'stopped after 50 ms' })
    expect(waiting).toMatchObject({ status: 'done', result: 'ok' })
    expect(FakeWorker.made[0]!.terminated).toBe(true)
  })
})
