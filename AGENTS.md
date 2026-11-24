# Agent Guide

This is a SolidJS 2.x project.
Solid is not React:
components run once (there is no re-render),
reactivity is fine-grained through signals,
and effects/memos have Solid-specific semantics.
Do not port React patterns.

## Versioned skills (in node_modules — read on demand)

The installed packages ship agent skills that match their exact installed versions:

- `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md`
  — repair guide mapping every dev-mode diagnostic code (e.g. `REACTIVE_WRITE_IN_OWNED_SCOPE`, `STRICT_READ_UNTRACKED`) to its prescribed fix.
  Read it whenever a Solid diagnostic code appears in test output or the browser console.
- `node_modules/@solidjs/diagnostics/skills/agent-loops/SKILL.md`
  — how to capture reactive evidence (which scopes re-ran and why, wasted recomputes, cost tables) and assert budgets, in tests and against live pages.

## Reactive diagnostics — capture evidence instead of guessing

Use these whenever you are debugging reactivity (something doesn't update, updates too often, or is slow)
or verifying a change didn't regress update granularity:

- **In tests:** `captureArtifact()` from `@solidjs/diagnostics` wraps a scenario
  and returns a serializable artifact of diagnostics + rerun attribution;
  matchers from `@solidjs/diagnostics/vitest` (`toHaveNoDiagnostics`, `toStayWithinRerunBudget`, `toHaveNoWaste`, …) assert on it.
  No browser needed.
- **Against the running dev server** (`diagnostics: true` in vite.config.ts; dev-only, no-op in builds).
  Requires an open page connected to the dev server (e.g. via a browser tool):
  - `GET /__solid/diagnostics` — status and connected client count
  - `POST /__solid/diagnostics` with JSON `{"method":"begin"}` then `{"method":"end"}` — capture a session into an artifact
  - `{"method":"whyDidRun","params":{"name":"<scope name>"}}` — recorded re-runs of one named scope in the open session
  - `{"method":"costs"}` — running cost tables for the open session

Name your signals/memos/effects (the `{ name: "..." }` option) — attribution reports scopes by name.

# Visualizations with JSXGraph

If asked to create a visualization with JSXGraph,
use the components in `./packages/components/src/Board.tsx`.
Components in that file are meant to be _declarative versions_ of their associated geometry elements.
They are not yet comprehensive or complete.
By any means improve them, but ensure they are compatible with Solid's reactivity system and are declarative.
For defaults shared by many boards, such as a teacher's preferences for a course,
wrap them in `BoardDefaults` (e.g. in the folder's `_layout.tsx`) rather than repeating props on every element.

A function prop such as `fn` redraws when the function is replaced, not when a signal read inside it changes:
derive the function from its signals, reading them outside the function it returns.

```tsx
const f = createMemo(() => {
  const c = k()
  return (x: number) => c * x
})
<Board.Plot fn={f()} />
```

# MDX pages

Keep MDX files mostly prose: TypeScript tooling (type errors, autocompletion, refactoring) works poorly inside MDX.
Put exercises, sequences and any non-trivial JSX in a sibling `*.exercises.tsx` file
and use them as one-line components, e.g. `import * as Exercise from './exam.exercises'` then `<Exercise.Practice id="..." />`.
Files with an extra dot in their name, such as `*.exercises.tsx` or `*.content.mdx`, are not turned into routes.
`bun run typecheck` also type-checks MDX files (`scripts/typecheck.mjs`).
Components the layout passes to MDX without an import must be declared in `MDXProvidedComponents` (`apps/ecam/mdx.d.ts`),
otherwise every component in MDX loses its types.

# Generated exercises

For randomised questions, use `createQuestionBank` from `@learning/core` (see `apps/ecam/src/routes/MN1M/exam.exercises.tsx`).
Each question names the `step` that answers it.
To share questions between banks, define them with `defineQuestions` and pass several sets to `createQuestionBank`.
Only the parameters returned by `generate` are saved, so `render` must be pure,
and `generate` must draw from the `random` it receives (not `Math.random`) so questions can be reproduced from a seed in tests.
With `MultipleChoice`, declare `answer` rather than `grade`: tests can then check every generated question.

# French typography

Course content is written in French.
In French prose, put a no-break space before two-part punctuation, never a normal space or no space:

- narrow no-break space (U+202F) before `?`, `!` and `;`: `Que vaut x ?`
- no-break space (U+00A0) before `:`: `Le programme suivant :`

Type the actual characters, both in Markdown and in JSX text.
This applies to prose only: never inside code, `tex` templates, `$…$` math or JavaScript (e.g. object keys like `A:`).

# Comments

Don't write comments that restate what the code already says,
such as comments on self-explanatory lines or doc comments that repeat a name or signature.
Only comment what the code can't say itself: a non-obvious reason, constraint or pitfall.
