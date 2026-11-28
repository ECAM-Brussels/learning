import { tex } from '@learning/core'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'
import { PythonCode } from '@learning/exercises/python/Code'
import type { JSX } from '@solidjs/web'
import { dedent } from 'es-toolkit/string'
import { For } from 'solid-js'

/** Exercises grow as students answer: they scroll inside the slide rather than overflow it. */
export function Panel(props: { children: JSX.Element }) {
  return (
    <div class="max-h-170 overflow-y-auto rounded-lg bg-white p-8 text-left shadow-inner">
      {props.children}
    </div>
  )
}

/** The questions of every dynamic programme, left blank for the teacher to answer on the slide. */
export function Questions() {
  return (
    <ol class="space-y-6">
      <li>Subproblems?</li>
      <li>Base cases?</li>
      <li>Guess?</li>
      <li>Recurrence?</li>
      <li>Complexity?</li>
    </ol>
  )
}

type Node = { n: number; x: number; y: number; children: Node[] }

/** The calls of the naive `fib(5)`, laid out as a tree: leaves evenly spaced, parents above their children. */
function callTree(n: number, depth = 0, next = { x: 0 }): Node {
  const children = n < 2 ? [] : [callTree(n - 1, depth + 1, next), callTree(n - 2, depth + 1, next)]
  const x = children.length ? (children[0]!.x + children.at(-1)!.x) / 2 : next.x++
  return { n, x, y: depth, children }
}

const tree = callTree(5)
const nodes: Node[] = []
const collect = (node: Node) => (nodes.push(node), node.children.forEach(collect))
collect(tree)
const colors: Record<number, string> = { 3: '#eb811b', 2: '#2563eb' }

/** The recursion tree of the naive `fib(5)`: the same calls, in colour, are computed again and again. */
export function FibTree() {
  const dx = 95
  const dy = 105
  const x = (node: Node) => 60 + node.x * dx
  const y = (node: Node) => 45 + node.y * dy
  return (
    <svg viewBox={`0 0 ${120 + 7 * dx} ${90 + 4 * dy}`} class="mx-auto h-130">
      <For each={nodes}>
        {(node) => (
          <For each={node.children}>
            {(child) => (
              <line x1={x(node)} y1={y(node)} x2={x(child)} y2={y(child)} stroke="#94a3b8" />
            )}
          </For>
        )}
      </For>
      <For each={nodes}>
        {(node) => (
          <g>
            <rect
              x={x(node) - 42}
              y={y(node) - 22}
              width="84"
              height="44"
              rx="10"
              fill={colors[node.n] ?? '#f1f5f9'}
              stroke="#475569"
            />
            <text
              x={x(node)}
              y={y(node) + 8}
              text-anchor="middle"
              font-size="24"
              font-family="Fira Mono, monospace"
              fill={colors[node.n] ? 'white' : '#1e293b'}
            >
              fib({node.n})
            </text>
          </g>
        )}
      </For>
    </svg>
  )
}

/** Python arguments from JavaScript values: JSON reads as Python for numbers, strings and lists. */
const args = (...values: unknown[]) => values.map((value) => JSON.stringify(value)).join(', ')

// Inputs on which the naive recursion takes far beyond the 10 seconds a run may last,
// and the memoized one a fraction of a second.
const DNA = ['AGACTTTCAAAGATATGCTGGGTAGAGGTCGAGGTTATTA', 'TTTGTTACCAATTCTCATTGTGTTTCGGAACTTGCGTTTT']
const WEIGHTS = [
  40, 7, 23, 25, 34, 11, 33, 37, 21, 33, 16, 32, 35, 9, 22, 36, 28, 11, 17, 31, 14, 33, 5, 10, 5,
  33, 39, 10, 17, 20,
]
const VALUES = [
  25, 89, 15, 79, 44, 95, 91, 55, 29, 10, 50, 95, 84, 83, 72, 98, 27, 79, 38, 70, 85, 26, 86, 98,
  74, 47, 20, 63, 95, 30,
]
const WORDS = ['bcddbbdaadaaccaadccdcaddbbbdcd', 'badabbaadbdabbbbbdcddadcbcbcdd']
const ALMOST_SORTED = [
  2, 2, 5, 8, 4, 5, 12, 11, 8, 11, 14, 11, 16, 14, 14, 15, 19, 20, 18, 20, 20, 25, 25, 23, 30, 29,
  26, 28, 33, 34, 34, 31, 36, 37, 37, 35, 37, 37, 42, 45, 41, 43, 45, 44, 48, 45, 50, 49, 52, 55,
  55, 52, 52, 57, 58, 60, 57, 59, 58, 63,
]
const STREET = [
  49, 23, 47, 12, 42, 41, 7, 33, 21, 18, 38, 5, 19, 21, 11, 17, 17, 5, 1, 27, 50, 17, 27, 1, 4, 7,
  16, 2, 20, 8, 7, 44, 36, 37, 23, 21, 50, 30, 39, 41, 42, 46, 40, 3, 26, 21, 39, 14, 39, 30, 28,
  44, 8, 44, 24, 33, 44, 17, 25, 19, 23, 4, 48, 46, 28, 2, 19, 45, 22, 19, 47, 50, 8, 20, 50, 27,
  21, 38, 2, 35,
]
const GRID = [
  [6, 4, 9, 1, 2, 3, 2, 2, 1, 3, 9, 6, 5, 1, 7],
  [3, 6, 7, 7, 7, 4, 7, 4, 3, 3, 9, 1, 9, 9, 7],
  [5, 3, 4, 1, 1, 5, 9, 8, 7, 5, 6, 3, 2, 3, 9],
  [1, 9, 5, 6, 9, 6, 1, 1, 4, 8, 1, 4, 9, 3, 7],
  [6, 4, 9, 5, 6, 4, 6, 6, 8, 8, 9, 8, 5, 4, 3],
  [7, 3, 8, 1, 6, 9, 7, 1, 3, 2, 5, 6, 9, 5, 3],
  [2, 1, 9, 4, 5, 1, 7, 7, 9, 9, 3, 9, 2, 2, 3],
  [7, 6, 9, 5, 5, 1, 4, 3, 5, 5, 9, 5, 6, 3, 7],
  [4, 1, 8, 7, 6, 9, 3, 9, 1, 3, 6, 9, 3, 3, 1],
  [2, 9, 1, 6, 2, 6, 5, 4, 9, 3, 4, 3, 2, 6, 8],
  [2, 2, 7, 5, 5, 2, 6, 8, 8, 2, 9, 9, 4, 6, 8],
  [6, 2, 2, 2, 8, 5, 5, 4, 3, 6, 7, 9, 9, 6, 6],
  [8, 7, 6, 3, 4, 8, 4, 6, 6, 7, 7, 4, 3, 8, 3],
  [7, 5, 6, 2, 6, 5, 8, 5, 3, 9, 5, 4, 6, 3, 9],
  [2, 5, 5, 8, 7, 7, 1, 9, 6, 7, 6, 2, 8, 9, 9],
]

const fast = 'Fast enough on a large input (is it memoized?)'

export const NaiveComplexity = () => (
  <MultipleChoice
    id="dp-naive-complexity"
    prompt={
      <p>
        How does the running time of the naive <code>fib(n)</code> grow with <code>n</code>?
      </p>
    }
    choices={{
      A: tex`O(n)`,
      B: tex`O(n^2)`,
      C: tex`O(n \log n)`,
      D: tex`\text{exponential in } n`,
    }}
    answer={'D'}
  />
)

export const FibCalls = () => (
  <PythonCode
    id="dp-fib-calls"
    prompt={
      <p>
        Add a global counter to the naive <code>fib</code>, incremented at each call. How many calls
        does <code>fib(20)</code> make? Print the number.
      </p>
    }
    initialCode={dedent /* python */ `
    calls = 0

    def fib(n):
        if n < 2:
            return n
        return fib(n - 1) + fib(n - 2)

    fib(20)
  `}
    tests={(expect) => ({ 'The number of calls of fib(20)': expect.toShow(21891) })}
  />
)

export const FibMemo = () => (
  <PythonCode
    id="dp-fib-memo"
    prompt={
      <p>
        Write <code>fib(n)</code> so that it remembers its results in a dictionary <code>memo</code>
        , without <code>functools</code>.
      </p>
    }
    initialCode={dedent /* python */ `
    memo = {}

    def fib(n):
        pass
  `}
    tests={(expect) => ({
      'fib is correct': expect.function('fib').toBehaveLike(
        dedent /* python */ `
        def fib(n):
            a, b = 0, 1
            for _ in range(n):
                a, b = b, a + b
            return a
      `,
        [[0], [1], [2], [10], [30]],
      ),
      // Compared in Python: the number is beyond what JavaScript represents exactly.
      [fast]: expect.with('fib(90)').toEqual('2880067194370816120'),
      'functools is not used': expect.code.not.toImport('functools'),
    })}
  />
)

export const MemoComplexity = () => (
  <MultipleChoice
    id="dp-memo-complexity"
    prompt={
      <p>
        With memoization, how does the running time of <code>fib(n)</code> grow, counting additions
        as constant time?
      </p>
    }
    choices={{
      A: tex`O(1)`,
      B: tex`O(n)`,
      C: tex`O(n^2)`,
      D: tex`\text{exponential in } n`,
    }}
    answer={'B'}
  />
)

export const GreedyCoins = () => (
  <MultipleChoice
    id="dp-greedy-coins"
    prompt={
      <p>
        With coins of 1, 3 and 4, a greedy cashier always gives the largest coin that fits. How many
        coins does it give for 6, and is it the fewest?
      </p>
    }
    choices={{
      A: '2 coins, the fewest',
      B: '3 coins, the fewest',
      C: '3 coins, but 2 are enough',
      D: '4 coins, but 3 are enough',
    }}
    answer={'C'}
  />
)

const LCS_MODEL = dedent /* python */ `
  from functools import cache

  def lcs(a, b):
      @cache
      def L(i, j):
          if i == len(a) or j == len(b):
              return 0
          if a[i] == b[j]:
              return 1 + L(i + 1, j + 1)
          return max(L(i + 1, j), L(i, j + 1))
      return L(0, 0)
`

export const LCS = () => (
  <PythonCode
    id="dp-lcs"
    prompt={
      <p>
        Write <code>lcs(a, b)</code>, the length of the longest common subsequence of the strings{' '}
        <code>a</code> and <code>b</code>: <code>lcs("ABCBDAB", "BDCABA")</code> is 4, for{' '}
        <code>"BCBA"</code>.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def lcs(a, b):
          pass
    `}
    tests={(expect) => ({
      'lcs is correct': expect.function('lcs').toBehaveLike(LCS_MODEL, [
        ['ABCBDAB', 'BDCABA'],
        ['', 'ABC'],
        ['ABC', 'ABC'],
        ['AGGTAB', 'GXTXAYB'],
      ]),
      [fast]: expect.function('lcs').toBehaveLike(LCS_MODEL, [DNA]),
    })}
  />
)

const LCS_CHECK = dedent /* python */ `
  def _check(a, b):
      from functools import cache
      @cache
      def best(i, j):
          if i == len(a) or j == len(b):
              return 0
          if a[i] == b[j]:
              return 1 + best(i + 1, j + 1)
          return max(best(i + 1, j), best(i, j + 1))
      def subsequence(s, t):
          it = iter(t)
          return all(c in it for c in s)
      s = lcs_string(a, b)
      if not isinstance(s, str):
          return f"lcs_string({a!r}, {b!r}) should return a string, not {type(s).__name__}"
      if not subsequence(s, a) or not subsequence(s, b):
          return f"{s!r} is not a subsequence of both {a!r} and {b!r}"
      if len(s) != best(0, 0):
          return f"{s!r} has length {len(s)}, but the longest has length {best(0, 0)}"
      return "ok"
`

export const LCSBonus = () => (
  <PythonCode
    id="dp-lcs-bonus"
    prompt={
      <p>
        <strong>Bonus.</strong> Write <code>lcs_string(a, b)</code>, which returns a longest common
        subsequence itself. Follow the choices that give the best value, from <code>L(0, 0)</code>.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def lcs_string(a, b):
          pass
    `}
    tests={(expect) => ({
      'lcs_string is defined': expect.function('lcs_string').toExist(),
      'A longest common subsequence of ABCBDAB and BDCABA': expect
        .with(`${LCS_CHECK}\n_check(${args('ABCBDAB', 'BDCABA')})`)
        .toEqual("'ok'"),
      'An empty string has none': expect
        .with(`${LCS_CHECK}\n_check(${args('', 'ABC')})`)
        .toEqual("'ok'"),
      'On long strings': expect.with(`${LCS_CHECK}\n_check(${args(...DNA)})`).toEqual("'ok'"),
    })}
  />
)

const KNAPSACK_MODEL = dedent /* python */ `
  from functools import cache

  def knapsack(weights, values, capacity):
      @cache
      def K(i, c):
          if i == len(weights):
              return 0
          best = K(i + 1, c)
          if weights[i] <= c:
              best = max(best, values[i] + K(i + 1, c - weights[i]))
          return best
      return K(0, capacity)
`

export const Knapsack = () => (
  <PythonCode
    id="dp-knapsack"
    prompt={
      <p>
        Write <code>knapsack(weights, values, capacity)</code>, the largest total value of items
        whose total weight is at most <code>capacity</code>, each item taken at most once.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def knapsack(weights, values, capacity):
          pass
    `}
    tests={(expect) => ({
      'knapsack is correct': expect.function('knapsack').toBehaveLike(KNAPSACK_MODEL, [
        [[1, 3, 4, 5], [1, 4, 5, 7], 7],
        [[10, 20, 30], [60, 100, 120], 50],
        [[5], [10], 4],
        [[], [], 10],
      ]),
      [fast]: expect.function('knapsack').toBehaveLike(KNAPSACK_MODEL, [[WEIGHTS, VALUES, 400]]),
    })}
  />
)

const KNAPSACK_CHECK = dedent /* python */ `
  def _check(weights, values, capacity):
      from functools import cache
      @cache
      def best(i, c):
          if i == len(weights):
              return 0
          result = best(i + 1, c)
          if weights[i] <= c:
              result = max(result, values[i] + best(i + 1, c - weights[i]))
          return result
      items = list(knapsack_items(weights, values, capacity))
      if len(set(items)) != len(items) or not all(isinstance(i, int) and 0 <= i < len(weights) for i in items):
          return f"{items} should be distinct indices between 0 and {len(weights) - 1}"
      weight = sum(weights[i] for i in items)
      if weight > capacity:
          return f"the items {items} weigh {weight}, more than the capacity {capacity}"
      value = sum(values[i] for i in items)
      if value != best(0, capacity):
          return f"the items {items} are worth {value}, but the best is {best(0, capacity)}"
      return "ok"
`

export const KnapsackBonus = () => (
  <PythonCode
    id="dp-knapsack-bonus"
    prompt={
      <p>
        <strong>Bonus.</strong> Write <code>knapsack_items(weights, values, capacity)</code>, which
        returns the list of the indices of the items to take.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def knapsack_items(weights, values, capacity):
          pass
    `}
    tests={(expect) => ({
      'knapsack_items is defined': expect.function('knapsack_items').toExist(),
      'A small knapsack': expect
        .with(`${KNAPSACK_CHECK}\n_check(${args([1, 3, 4, 5], [1, 4, 5, 7], 7)})`)
        .toEqual("'ok'"),
      'The best value is not the most valuable item first': expect
        .with(`${KNAPSACK_CHECK}\n_check(${args([10, 20, 30], [60, 100, 120], 50)})`)
        .toEqual("'ok'"),
      'Thirty items': expect
        .with(`${KNAPSACK_CHECK}\n_check(${args(WEIGHTS, VALUES, 400)})`)
        .toEqual("'ok'"),
    })}
  />
)

const COINS_MODEL = dedent /* python */ `
  from functools import cache

  def min_coins(coins, amount):
      @cache
      def M(a):
          if a == 0:
              return 0
          return 1 + min(M(a - c) for c in coins if c <= a)
      return M(amount)
`

export const Coins = () => (
  <PythonCode
    id="dp-coins"
    prompt={
      <p>
        Write <code>min_coins(coins, amount)</code>, the fewest coins that add up to{' '}
        <code>amount</code>. There is always a coin of 1, and each coin can be used several times.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def min_coins(coins, amount):
          pass
    `}
    tests={(expect) => ({
      'min_coins is correct': expect.function('min_coins').toBehaveLike(COINS_MODEL, [
        [[1, 3, 4], 6],
        [[1, 5, 10, 25], 63],
        [[1, 7, 10], 14],
        [[1, 2, 5], 0],
      ]),
      [fast]: expect.function('min_coins').toBehaveLike(COINS_MODEL, [[[1, 5, 6, 9], 150]]),
    })}
  />
)

const COINS_CHECK = dedent /* python */ `
  def _check(coins, amount):
      from functools import cache
      @cache
      def best(a):
          if a == 0:
              return 0
          return 1 + min(best(a - c) for c in coins if c <= a)
      used = list(coins_used(coins, amount))
      if not all(c in coins for c in used):
          return f"{used} contains a coin that is not in {coins}"
      if sum(used) != amount:
          return f"the coins {used} add up to {sum(used)}, not {amount}"
      if len(used) != best(amount):
          return f"{used} uses {len(used)} coins, but {best(amount)} are enough"
      return "ok"
`

export const CoinsBonus = () => (
  <PythonCode
    id="dp-coins-bonus"
    prompt={
      <p>
        <strong>Bonus.</strong> Write <code>coins_used(coins, amount)</code>, which returns the list
        of the coins to give.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def coins_used(coins, amount):
          pass
    `}
    tests={(expect) => ({
      'coins_used is defined': expect.function('coins_used').toExist(),
      'Where greedy fails: 6 with 1, 3 and 4': expect
        .with(`${COINS_CHECK}\n_check(${args([1, 3, 4], 6)})`)
        .toEqual("'ok'"),
      'Where greedy fails: 14 with 1, 7 and 10': expect
        .with(`${COINS_CHECK}\n_check(${args([1, 7, 10], 14)})`)
        .toEqual("'ok'"),
      'A larger amount': expect
        .with(`${COINS_CHECK}\n_check(${args([1, 5, 6, 9], 150)})`)
        .toEqual("'ok'"),
    })}
  />
)

const EDIT_MODEL = dedent /* python */ `
  from functools import cache

  def edit_distance(a, b):
      @cache
      def D(i, j):
          if i == len(a):
              return len(b) - j
          if j == len(b):
              return len(a) - i
          return min(D(i + 1, j + 1) + (a[i] != b[j]), 1 + D(i + 1, j), 1 + D(i, j + 1))
      return D(0, 0)
`

export const EditDistance = () => (
  <PythonCode
    id="dp-edit-distance"
    prompt={
      <p>
        Write <code>edit_distance(a, b)</code>, the fewest insertions, deletions and substitutions
        of one character that turn <code>a</code> into <code>b</code>:{' '}
        <code>edit_distance("kitten", "sitting")</code> is 3.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def edit_distance(a, b):
          pass
    `}
    tests={(expect) => ({
      'edit_distance is correct': expect.function('edit_distance').toBehaveLike(EDIT_MODEL, [
        ['kitten', 'sitting'],
        ['', 'abc'],
        ['abc', ''],
        ['flaw', 'lawn'],
        ['intention', 'execution'],
      ]),
      [fast]: expect.function('edit_distance').toBehaveLike(EDIT_MODEL, [WORDS]),
    })}
  />
)

const EDIT_CHECK = dedent /* python */ `
  def _check(a, b):
      from functools import cache
      @cache
      def best(i, j):
          if i == len(a):
              return len(b) - j
          if j == len(b):
              return len(a) - i
          return min(best(i + 1, j + 1) + (a[i] != b[j]), 1 + best(i + 1, j), 1 + best(i, j + 1))
      def one_edit(s, t):
          if len(s) == len(t):
              return sum(x != y for x, y in zip(s, t)) == 1
          if abs(len(s) - len(t)) != 1:
              return False
          short, long = sorted((s, t), key=len)
          return any(long[:k] + long[k + 1:] == short for k in range(len(long)))
      path = list(edit_path(a, b))
      if not path or path[0] != a or path[-1] != b:
          return f"the path should start with {a!r} and end with {b!r}: {path}"
      for s, t in zip(path, path[1:]):
          if not one_edit(s, t):
              return f"{s!r} and {t!r} are not one edit apart"
      if len(path) - 1 != best(0, 0):
          return f"the path makes {len(path) - 1} edits, but {best(0, 0)} are enough"
      return "ok"
`

export const EditDistanceBonus = () => (
  <PythonCode
    id="dp-edit-distance-bonus"
    prompt={
      <p>
        <strong>Bonus.</strong> Write <code>edit_path(a, b)</code>, which returns the list of the
        strings from <code>a</code> to <code>b</code>, each one edit away from the previous:{' '}
        <code>["kitten", "sitten", "sittin", "sitting"]</code>.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def edit_path(a, b):
          pass
    `}
    tests={(expect) => ({
      'edit_path is defined': expect.function('edit_path').toExist(),
      'From kitten to sitting': expect
        .with(`${EDIT_CHECK}\n_check(${args('kitten', 'sitting')})`)
        .toEqual("'ok'"),
      'From an empty string': expect
        .with(`${EDIT_CHECK}\n_check(${args('', 'abc')})`)
        .toEqual("'ok'"),
      'To an empty string': expect
        .with(`${EDIT_CHECK}\n_check(${args('abc', '')})`)
        .toEqual("'ok'"),
      'Long strings': expect.with(`${EDIT_CHECK}\n_check(${args(...WORDS)})`).toEqual("'ok'"),
    })}
  />
)

const LIS_MODEL = dedent /* python */ `
  from functools import cache

  def lis(a):
      @cache
      def L(i):
          return 1 + max((L(j) for j in range(i + 1, len(a)) if a[j] > a[i]), default=0)
      return max((L(i) for i in range(len(a))), default=0)
`

export const LIS = () => (
  <PythonCode
    id="dp-lis"
    prompt={
      <p>
        Write <code>lis(a)</code>, the length of the longest strictly increasing subsequence of the
        list <code>a</code>: <code>lis([10, 9, 2, 5, 3, 7, 101, 18])</code> is 4, for{' '}
        <code>[2, 3, 7, 18]</code>.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def lis(a):
          pass
    `}
    tests={(expect) => ({
      'lis is correct': expect
        .function('lis')
        .toBehaveLike(LIS_MODEL, [
          [[10, 9, 2, 5, 3, 7, 101, 18]],
          [[]],
          [[5, 4, 3]],
          [[1, 2, 2, 3]],
        ]),
      [fast]: expect.function('lis').toBehaveLike(LIS_MODEL, [[ALMOST_SORTED]]),
    })}
  />
)

const LIS_CHECK = dedent /* python */ `
  def _check(a):
      from functools import cache
      @cache
      def best(i):
          return 1 + max((best(j) for j in range(i + 1, len(a)) if a[j] > a[i]), default=0)
      longest = max((best(i) for i in range(len(a))), default=0)
      s = list(lis_sequence(a))
      it = iter(a)
      if not all(x in it for x in s):
          return f"{s} is not a subsequence of {a}"
      if any(x >= y for x, y in zip(s, s[1:])):
          return f"{s} is not increasing"
      if len(s) != longest:
          return f"{s} has length {len(s)}, but the longest has length {longest}"
      return "ok"
`

export const LISBonus = () => (
  <PythonCode
    id="dp-lis-bonus"
    prompt={
      <p>
        <strong>Bonus.</strong> Write <code>lis_sequence(a)</code>, which returns a longest
        increasing subsequence itself, as a list.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def lis_sequence(a):
          pass
    `}
    tests={(expect) => ({
      'lis_sequence is defined': expect.function('lis_sequence').toExist(),
      'The example': expect
        .with(`${LIS_CHECK}\n_check(${args([10, 9, 2, 5, 3, 7, 101, 18])})`)
        .toEqual("'ok'"),
      'An empty list': expect.with(`${LIS_CHECK}\n_check(${args([])})`).toEqual("'ok'"),
      'A long list': expect.with(`${LIS_CHECK}\n_check(${args(ALMOST_SORTED)})`).toEqual("'ok'"),
    })}
  />
)

const LOOT_MODEL = dedent /* python */ `
  from functools import cache

  def max_loot(houses):
      @cache
      def R(i):
          if i >= len(houses):
              return 0
          return max(R(i + 1), houses[i] + R(i + 2))
      return R(0)
`

export const HouseRobber = () => (
  <PythonCode
    id="dp-house-robber"
    prompt={
      <p>
        A burglar visits a street of houses, <code>houses[i]</code> being the loot in house{' '}
        <code>i</code>, but robbing two neighbouring houses sets off the alarm. Write{' '}
        <code>max_loot(houses)</code>, the largest loot: <code>max_loot([2, 7, 9, 3, 1])</code> is
        12.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def max_loot(houses):
          pass
    `}
    tests={(expect) => ({
      'max_loot is correct': expect
        .function('max_loot')
        .toBehaveLike(LOOT_MODEL, [[[2, 7, 9, 3, 1]], [[]], [[5]], [[2, 1, 1, 2]]]),
      [fast]: expect.function('max_loot').toBehaveLike(LOOT_MODEL, [[STREET]]),
    })}
  />
)

const LOOT_CHECK = dedent /* python */ `
  def _check(houses):
      from functools import cache
      @cache
      def best(i):
          if i >= len(houses):
              return 0
          return max(best(i + 1), houses[i] + best(i + 2))
      robbed = sorted(loot_houses(houses))
      if len(set(robbed)) != len(robbed) or not all(isinstance(i, int) and 0 <= i < len(houses) for i in robbed):
          return f"{robbed} should be distinct indices between 0 and {len(houses) - 1}"
      if any(j - i == 1 for i, j in zip(robbed, robbed[1:])):
          return f"{robbed} contains two neighbouring houses"
      loot = sum(houses[i] for i in robbed)
      if loot != best(0):
          return f"the houses {robbed} give {loot}, but the best is {best(0)}"
      return "ok"
`

export const HouseRobberBonus = () => (
  <PythonCode
    id="dp-house-robber-bonus"
    prompt={
      <p>
        <strong>Bonus.</strong> Write <code>loot_houses(houses)</code>, which returns the list of
        the indices of the houses to rob.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def loot_houses(houses):
          pass
    `}
    tests={(expect) => ({
      'loot_houses is defined': expect.function('loot_houses').toExist(),
      'The example': expect.with(`${LOOT_CHECK}\n_check(${args([2, 7, 9, 3, 1])})`).toEqual("'ok'"),
      'Every other house is not always best': expect
        .with(`${LOOT_CHECK}\n_check(${args([2, 1, 1, 2])})`)
        .toEqual("'ok'"),
      'A long street': expect.with(`${LOOT_CHECK}\n_check(${args(STREET)})`).toEqual("'ok'"),
    })}
  />
)

const PATH_MODEL = dedent /* python */ `
  from functools import cache

  def min_path(grid):
      m, n = len(grid), len(grid[0])
      @cache
      def P(i, j):
          if i == m - 1 and j == n - 1:
              return grid[i][j]
          options = []
          if i + 1 < m:
              options.append(P(i + 1, j))
          if j + 1 < n:
              options.append(P(i, j + 1))
          return grid[i][j] + min(options)
      return P(0, 0)
`

export const MinPath = () => (
  <PythonCode
    id="dp-min-path"
    prompt={
      <p>
        A robot crosses a grid from the top left to the bottom right, moving only right or down, and
        pays <code>grid[i][j]</code> for each cell it enters, the first and the last included. Write{' '}
        <code>min_path(grid)</code>, the cheapest cost:{' '}
        <code>min_path([[1, 3, 1], [1, 5, 1], [4, 2, 1]])</code> is 7.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def min_path(grid):
          pass
    `}
    tests={(expect) => ({
      'min_path is correct': expect.function('min_path').toBehaveLike(PATH_MODEL, [
        [
          [
            [1, 3, 1],
            [1, 5, 1],
            [4, 2, 1],
          ],
        ],
        [[[5]]],
        [
          [
            [1, 2, 3],
            [4, 5, 6],
          ],
        ],
      ]),
      [fast]: expect.function('min_path').toBehaveLike(PATH_MODEL, [[GRID]]),
    })}
  />
)

const PATH_CHECK = dedent /* python */ `
  def _check(grid):
      from functools import cache
      m, n = len(grid), len(grid[0])
      @cache
      def best(i, j):
          if i == m - 1 and j == n - 1:
              return grid[i][j]
          options = []
          if i + 1 < m:
              options.append(best(i + 1, j))
          if j + 1 < n:
              options.append(best(i, j + 1))
          return grid[i][j] + min(options)
      cells = [tuple(cell) for cell in min_path_cells(grid)]
      if not cells or cells[0] != (0, 0) or cells[-1] != (m - 1, n - 1):
          return f"the path should go from (0, 0) to {(m - 1, n - 1)}: {cells}"
      for (i, j), (k, l) in zip(cells, cells[1:]):
          if (k - i, l - j) not in ((1, 0), (0, 1)):
              return f"the path goes from {(i, j)} to {(k, l)}, which is neither right nor down"
      cost = sum(grid[i][j] for i, j in cells)
      if cost != best(0, 0):
          return f"the path costs {cost}, but the cheapest costs {best(0, 0)}"
      return "ok"
`

export const MinPathBonus = () => (
  <PythonCode
    id="dp-min-path-bonus"
    prompt={
      <p>
        <strong>Bonus.</strong> Write <code>min_path_cells(grid)</code>, which returns the cheapest
        path as the list of the cells <code>(i, j)</code> it visits, from <code>(0, 0)</code>.
      </p>
    }
    initialCode={dedent /* python */ `
      from functools import cache

      def min_path_cells(grid):
          pass
    `}
    tests={(expect) => ({
      'min_path_cells is defined': expect.function('min_path_cells').toExist(),
      'The example': expect
        .with(
          `${PATH_CHECK}\n_check(${args([
            [1, 3, 1],
            [1, 5, 1],
            [4, 2, 1],
          ])})`,
        )
        .toEqual("'ok'"),
      'A single cell': expect.with(`${PATH_CHECK}\n_check(${args([[5]])})`).toEqual("'ok'"),
      'A 15 × 15 grid': expect.with(`${PATH_CHECK}\n_check(${args(GRID)})`).toEqual("'ok'"),
    })}
  />
)
