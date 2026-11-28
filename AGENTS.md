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

## Database tests

Tests of what reaches the database, saved answers above all, live in `packages/core/db`.
They run against an in-memory Postgres with the real schema, `createTestDatabase` from `@learning/db/testing`,
so they need no database server and can't reach a real one.
They replace `@learning/db` and the request's user with `mock.module`,
and Bun shares module mocks between the files of a run,
whereas the other tests replace `context.remote.ts` itself:
so `bun run test` in `packages/core` runs `./src`, then `./db` apart, as `bun run test:db`.
`db/saving.test.tsx` shows the setup, from answering an exercise to the rows it saves.

## Teacher documentation

`apps/ecam/src/routes/doc` documents the platform for teachers, in French, with English page names.
Whenever a change affects what teachers write, see or run
(exercises and their props, components, MDX syntax, scripts, setup),
update these pages and their live examples (`*.demo.tsx`) in the same change.

## Visualizations with JSXGraph

Build figures with the declarative components in `packages/components/src/Board.tsx`,
or `Board.Custom` for a one-off construction,
following the `jsxgraph-figure` skill (`.claude/skills/jsxgraph-figure/SKILL.md`).

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

A `:::::deck` block is a reveal.js presentation, made into slides by `packages/mdx/deck.ts`;
its syntax is documented in `apps/ecam/src/routes/doc/slides.mdx`.
Its title slide is given in brackets, `:::::deck[title="…"]`, never in `{…}` attributes, which trip the MDX language server,
and its fence needs more colons than any directive inside it.
`annotators="…"` in the brackets lets those people draw on the deck (`packages/components/src/Annotations.tsx`):
the server reads the list from the page's source (`packages/mdx/brackets.ts`), so it must stay a literal string,
and each drawable deck on a page needs its own `id="…"`.

## Exercise steps

To create or change an exercise, a question bank or a Python exercise,
follow the `new-step` skill (`.claude/skills/new-step/SKILL.md`).
These rules hold whatever the task:

- Every exercise component is a step made with `createStep` or `createDerivedStep` from `@learning/core`,
  so that it exposes `options`, `feedback`, `children` and its data as props, and can be the `step` of a skill.
  Never write a function component that takes props and passes them to a step, to preset the others:
  it hides `options` and `feedback`, and its data is neither saved nor checkable.
  For an exercise model used with different data, make a derived step.
  An exercise that appears once is a step with fixed props, `id` included:
  write it in place, or in a component **without props** that returns it,
  `export const Knapsack = () => <PythonCode id="knapsack" … />`, to use as `<Exercise.Knapsack />`.
- Declare steps at module level, never inside a component.
- Students' answers are saved with each step's data (its props, except those wrapped in `omitFromJSON`), `name` and inputs.
  The database is purged at the start of each academic year, when the `next` branch is merged into `main`.
  Until then, on `main` and branches merged into it, never change what an existing step saves,
  even to follow these rules
  (turning a function component into a derived step, or replacing `Matplotlib` with `PythonCode`, changes it):
  make such changes on `next`.
- A step's `name` and a skill's id (`defineSkill`) are saved with answers: never change them, and namespace new ones.
- What is saved must reproduce the question:
  `createDerivedStep`'s data function and a skill's `render` are pure,
  and `generate` draws only from the `random` it receives.
- Python exercises are `PythonCode` steps tested with `expect`;
  the `{ desc, test, check }` tests, `Matplotlib` and `PythonFunction` are deprecated.
  Write their Python, models and starting code included, as ``dedent /* python */ `…` `` (`dedent` from `es-toolkit/string`),
  not as a string with `\n`: VS Code then highlights it as Python.
  A starting code (`initialCode`) runs as soon as it appears: put `pass` in an empty body.
- Steps that could teach more than one page go in `packages/exercises`; when unsure, ask.

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
