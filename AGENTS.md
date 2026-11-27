# Agent Guide

This is a SolidJS 2.x project.
Solid is not React:
components run once (there is no re-render),
reactivity is fine-grained through signals,
and effects/memos have Solid-specific semantics.
Do not port React patterns.

## Solid diagnostics

- `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md`
  — repair guide mapping every dev-mode diagnostic code (e.g. `REACTIVE_WRITE_IN_OWNED_SCOPE`, `STRICT_READ_UNTRACKED`) to its fix.
  Read it whenever a diagnostic code appears.
- `node_modules/@solidjs/diagnostics/skills/agent-loops/SKILL.md`
  — how to capture which scopes re-ran and why,
  from a page open on the dev server (`diagnostics: true` in `vite.config.ts`).

Tests load Solid's production build, which reports no diagnostics:
to see them, add `--conditions=development`, e.g. `bun test --conditions=development --conditions=browser`.
The browser console shows them on the dev server.
Name your signals/memos/effects (the `{ name: "..." }` option): diagnostics report scopes by name.

## Running

- `bun run dev`, in the dev container where SymAPI runs,
  serves the site on port 3000 and runs every test suite in watch mode.
- `bun run test` runs every suite once;
  in a package, `bun run test` runs its own (`bun test --conditions=browser`).
- `bun run typecheck` type-checks the whole repository; `bun run lint` fixes and formats.

## Teacher documentation

`apps/ecam/src/routes/doc` documents the platform for teachers, in French, with English page names.
Whenever a change affects what teachers write, see or run
(exercises and their props, components, MDX syntax, scripts, setup),
update these pages and their live examples (`*.demo.tsx`) in the same change.

## Visualizations with JSXGraph

If asked to create a visualization with JSXGraph,
use the components in `./packages/components/src/Board.tsx`.
Components in that file are meant to be _declarative versions_ of their associated geometry elements.
They are not yet comprehensive or complete.
By all means improve them, but ensure they are compatible with Solid's reactivity system and are declarative.
For a one-off construction the components don't cover, use `Board.Custom` with plain JSXGraph code
rather than adding a component or managing the board by hand.
For defaults shared by many boards, such as a teacher's preferences for a course,
wrap them in `BoardDefaults` (e.g. in the folder's `_layout.tsx`)
rather than repeating props on every element.
Keep JSXGraph's attribute names and shapes;
where these components depart from its defaults, do it in `builtInDefaults` in `Board.tsx`.

JSXGraph places labels away from other elements with `label: { autoPosition: true }`:
never reimplement label placement.
It is on by default on 2D boards; set `label: { autoPosition: false }` to keep a label where `offset` puts it.
In a 3D view it is off by default,
because each label is checked against the view's hundreds of elements at every update:
turn it on for the labels that need it, e.g. `<Board.Point3D label={{ autoPosition: true }} …/>`,
rather than for the whole view.
Coordinates are positions, not points:
points JSXGraph creates for coordinates or bounds (polygon vertices, an angle's points, an integral's bounds) are hidden.
For a visible point, pass a `<Board.Point>`.

A function prop such as `fn` redraws when the function is replaced, not when a signal read inside it changes:
derive the function from its signals, reading them outside the function it returns.

```tsx
const f = createMemo(() => {
  const c = k()
  return (x: number) => c * x
})
<Board.Plot fn={f()} />
```

## Markdown and MDX pages

In every Markdown and MDX file, start a new line at the end of each clause, not only of each sentence,
so that a diff shows the clause that changed; Markdown still joins the lines into one paragraph.
Never start the new line with what would open a block (`- `, `1. `, `#`, `>`, `<`, `{`).
Text inside a JSX element is the exception: Prettier fills it up to 100 characters.

Keep MDX files mostly prose:
TypeScript tooling (type errors, autocompletion, refactoring) works poorly inside MDX.
Put exercises, sequences and any non-trivial JSX in a sibling `*.exercises.tsx` file
and use them as one-line components, e.g. `import * as Exercise from './exam.exercises'` then `<Exercise.Practice id="..." />`.
Files with an extra dot in their name, such as `*.exercises.tsx` or `*.content.mdx`, are not turned into routes.
`bun run typecheck` also type-checks MDX files (`scripts/typecheck.mjs`).
Components the layout passes to MDX without an import must be declared in `MDXProvidedComponents` (`apps/ecam/mdx.d.ts`),
otherwise every component in MDX loses its types.
Write LaTeX that contains curly braces with `tex` from `@learning/core` (``{tex`\frac{a}{b}`}``, ``{tex.display`…`}``), not `$…$`:
the MDX language server reads the braces as expressions.
Leave a blank line before the `:::` that closes a directive after a list,
otherwise Markdown, and Prettier, take it as part of the last item.

A `:::::deck` block is a reveal.js presentation (`packages/mdx/deck.ts`):
`#` opens a section, `##` a slide, `---` a slide without title,
and a top-level `<Deck.…>` element is a slide of its own.
Each section is a vertical stack of its slides, `<Deck.…>` ones included;
slides before the first `#` stay horizontal.
Its fence needs more colons than any directive inside it.
It opens on a title slide only when its brackets give one, as `:::::deck[title="…" subtitle="…"]` (also `author`, `institute`, `date`):
brackets rather than `{…}` attributes, which trip the MDX language server;
what it is not given comes from the page's `defineMeta`.
`annotators="a@ecam.be, b@ecam.be"` in the brackets lets those people draw on the deck, live for everyone watching
(`packages/components/src/Annotations.tsx`, saved by `packages/core/src/annotations.remote.ts`);
the server reads the list from the page's source (`packages/mdx/brackets.ts`), so it must stay a literal string,
and several drawable decks on a page need an `id="…"` each.
See `apps/ecam/src/routes/doc/slides.mdx`.

## Exercise steps

Every exercise component is a step made with `createStep` or `createDerivedStep` from `@learning/core`,
so that it exposes the `options`, `feedback` and `children` props,
and its data as props too, like any other step,
and can be the `step` of a skill.
Never write a function component that returns a step as JSX to preset some of its props:

```tsx
// Wrong: Representable hides `options` and `feedback`, and its data is not saved or checkable
export const Representable = (props: { x: string }) => (
  <MultipleChoice prompt={…} choices={…} answer={…} />
)

// Right
export const Representable = createDerivedStep(
  MultipleChoice,
  { x: 'expr' },
  (data) => ({ prompt: …, choices: …, answer: isDyadic(data.x) ? 'true' : 'false' }),
  { feedback: (ctx) => … },
)
```

A step gets its data from the props declared in `schema.data` (`createStep`),
or from the data function of `createDerivedStep`, which maps the derived step's props to the base step's data.
Only the derived step's props are saved, so the data function must be pure.
The fourth argument of `createDerivedStep` replaces parts of the base step, such as `feedback` or `children`.
Declare steps at module level, never inside a component.
Using a step with fixed props, such as several instances in a `Sequence`, is fine:
the rule is about components that define a kind of exercise.

Students' answers are saved with each step's data (its props, except those wrapped in `omitFromJSON`), `name` and inputs.
The database is purged at the start of each academic year, when the `next` branch is merged into `main`.
Until then, on `main` and branches merged into it, never change what an existing step saves,
even to follow these rules:
turning a function component into a derived step, or replacing `Matplotlib` with `PythonCode`, changes it.
Make such changes on `next`; new steps follow these rules everywhere.

Python exercises are `PythonCode` steps, or steps derived from it,
and write their tests with `expect`: `tests={(expect) => ({ 'description': expect.… })}`.
The array of `{ desc, test, check }` tests and the steps built on it (`Matplotlib`, `PythonFunction`) are deprecated.
If `expect` lacks a check that several exercises need, add it to `expect` in `packages/repl/index.ts`.

Put a step in `packages/exercises` (`@learning/exercises`)
whenever it could help teach more than the page it was written for:
a skill or concept also taught elsewhere, such as factorising, a derivative at a point, a numerical method or a Python construct.
Keep in the route folder only steps tied to that page's content or story.
Package steps take everything as props and never refer to a course;
file them by subject (`math/algebra`, `numerical`, `python`, …) and add them to the package's `exports`.
When unsure whether a step belongs in the package, ask.

## Generated exercises

For randomised questions, define skills with `defineSkill` and pass them to `createQuestionBank`,
both from `@learning/core` (see `apps/ecam/src/routes/MN1M/exam.exercises.tsx`).
A skill's id is saved with students' answers:
never change it, and namespace new ones (e.g. `'calculus/chain'`).
Each skill names the `step` that answers its questions,
and may list `prerequisites: () => [...]`, other skills from any module.
Only the parameters returned by `generate` are saved, so `render` must be pure,
and `generate` must draw from the `random` it receives (not `Math.random`)
so questions can be reproduced from a seed in tests.
With `MultipleChoice`, declare `answer` rather than `grade`: tests can then check every generated question.

## SymAPI

`expr` in `@learning/core` asks SymAPI (`apps/symapi`, FastAPI and sympy) whatever Compute Engine can't decide.
Tests don't need SymAPI running: they answer its requests from `apps/symapi/tests/contract.json`,
and SymAPI's own tests check that it still gives every response recorded there.
After changing what `expr` asks, or adding a test that asks something new,
record the contract again with `bun run test:record` in `packages/core`,
where SymAPI is running (the dev container).
Record with the whole suite, never a single file: the contract is replaced by the requests of that run.

## French typography

Course content is written in French.
In French prose, put a no-break space before two-part punctuation, never a normal space or no space:

- narrow no-break space (U+202F) before `?`, `!` and `;`: `Que vaut x ?`
- no-break space (U+00A0) before `:`: `Le programme suivant :`

Type the actual characters, both in Markdown and in JSX text.
This applies to prose only:
never inside code, `tex` templates, `$…$` math or JavaScript (e.g. object keys like `A:`).

## Comments

Don't write comments that restate what the code already says,
such as comments on self-explanatory lines or doc comments that repeat a name or signature.
Only comment what the code can't say itself: a non-obvious reason, constraint or pitfall.
