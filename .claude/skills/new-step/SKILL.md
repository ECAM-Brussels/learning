---
name: new-step
description: Create or change an exercise (a step), a randomised question bank, or a Python exercise on the learning platform. Use whenever a request asks for an exercise, a question, a quiz, a step, a skill for `createQuestionBank`, or a Python exercise, in English or French ("crée un exercice", "ajoute une question"), and before changing what an existing step saves.
---

# Creating an exercise step

The rules in `AGENTS.md` ("Exercise steps", "Generated exercises", "SymAPI", "French typography") always apply;
this is the procedure that follows them.
Read those sections first if they are not in context.

## 1. Pin down the exercise

Before writing code, know:

- the data that changes from one question to the next (they become the step's props, and are saved);
- what counts as a right answer, including equivalent forms;
- the frequent mistakes, and what the feedback or a follow-up question should say for each;
- the page that will use it.

Ask the teacher for whatever the request leaves out.

## 2. Choose how to build it

1. **An existing step almost fits** (`Simple`, `MultipleChoice`, `Factor`, `PythonCode`, …):
   derive it with `createDerivedStep(Base, dataSchema, (data) => baseProps, overrides?)`.
   The data function maps the new step's props to the base step's;
   only the new props are saved, so it must be pure.
   The fourth argument replaces parts of the base, such as `feedback` or `children`.
   Example: `apps/ecam/src/routes/doc/new-exercise.demo.tsx`.
2. **Nothing fits**: `createStep({ name, schema: { data, inputs }, prompt, grade, feedback })`.
   Example: `packages/exercises/math/algebra/Expand.tsx`.
   `name` is saved with answers: namespace it (`'math/algebra/expand'`) and never change it.
3. **Randomised questions**: `defineSkill(id, { step, generate, render, prerequisites? })`
   for each kind of question, then `createQuestionBank(...skills)`.
   Example: `apps/ecam/src/routes/MN1M/exam.exercises.tsx`.
   `generate` draws only from the `random` it receives; `render` is pure;
   with `MultipleChoice`, return `answer` rather than `grade`.
4. **Python**: a `PythonCode` step, or one derived from it,
   tested with `tests={(expect) => ({ 'description': expect.toShow(42) })}`.
   Write Python, `initialCode` and models included, as ``dedent /* python */ `…` `` from `es-toolkit/string`,
   so that VS Code highlights it, with `pass` in an empty body: the starting code runs at once.
   Prefer what students can't trip on: `toShow` and `output()` accept a printed answer,
   `function(name).toBehaveLike(model, calls)` tests a function on several inputs,
   `code.toCall`/`toUse`/`toImport` read the syntax rather than the text,
   and `withInput(…)` feeds `input()`.
   The full list, for teachers, is `apps/ecam/src/routes/doc/python.mdx`.
   Never the deprecated `{ desc, test, check }` array, `Matplotlib` or `PythonFunction`.
   A check several exercises need goes into `packages/repl/python/expect.ts`,
   with its Python side in `checks.py`.

Never a function component that takes props and passes them to a step (see `AGENTS.md`):
`createDerivedStep` is for a model used with different data.
An exercise that appears once is the step itself, with all its props, `id` included,
in a component without props when the MDX should stay short.

## 3. Choose where it goes

- In `packages/exercises`, filed by subject (`math/algebra`, `numerical`, `python`, …)
  and added to the package's `exports`,
  when it could teach more than this page: a skill also taught elsewhere.
  It then takes everything as props and never names a course.
- In the route folder, in a `*.exercises.tsx` file next to the page,
  when it belongs to that page's content or story.
- When unsure, ask.

Declare it at module level with `export const`, then use it from the MDX page as a one-line component:
`import * as Exercise from './limits.exercises'`, `<Exercise.Tangent id="tangente-1" f="x^2" a="1" />`.

## 4. Changing an existing step

If students may already have answered it,
anything that changes what it saves (its props, `name`, inputs, or turning a component into a derived step)
goes on the `next` branch, never on `main` or a branch merged into it.
Say so and ask before making such a change elsewhere.

## 5. Write it

- Prompts and feedback are French prose: no-break spaces before `:` (U+00A0) and `? ! ;` (U+202F),
  typed as the characters themselves; not inside `tex` or code.
- Formulas with braces go through `` tex`…` ``.
- In `feedback`, `<ctx.Self />` asks the same question again;
  other steps inside it build the remediation (`apps/ecam/src/routes/doc/remediation.mdx`).
- Read `ctx.data`, `ctx.inputs` and `ctx.correct` where they are used, in the JSX:
  they are reactive getters, and destructuring them freezes them.

## 6. Test it

- A package step: a test next to it, like `packages/exercises/MultipleChoice.test.tsx`,
  that answers right and wrong and checks what is stored.
- A question bank: check every skill over a few hundred seeds,
  like `apps/ecam/src/routes/MN1M/exam.exercises.test.tsx`
  (the answer is among the choices, no `NaN`, `undefined` or `Infinity`).
- Run tests with `--conditions=development` once, to see Solid's diagnostics.
- If a test makes `expr` ask SymAPI something new, record the contract again:
  `bun run test:record` in `packages/core`, in the dev container, with the whole suite.

## 7. Finish

- `bun run typecheck` (it covers MDX) and `bun run lint`.
- If the change affects what teachers write or see (a new package step, new props),
  update `apps/ecam/src/routes/doc` and its `*.demo.tsx` in the same change.
- Ask the teacher to try it on the dev server, answering right, then wrong:
  a new step is not done until someone has seen its feedback.
