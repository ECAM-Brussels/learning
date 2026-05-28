# JS guidelines

- As much as possible,
  use modern ES syntax and features.

- `es-toolkit` is installe in the project,
  so use it to write modern and concise code.

- In the `apps` folder, favour concise and readable code.
  The target audience of this code are teachers (mathematics, physics, chemistry) and students.
  In particular, use arrow functions and implicit returns where possible.
  Avoid creating IIFEs,
  these documents should be readable and approachable for non-developers.

- Avoid obvious comments.

- Code should be written in good English, not in French.

## Framework and stack

- This project uses Solid JS 2.0,
  which is neither react, nor Solid 1.0.
  Reactivity is signal-based
  and accessing state is done via function calls.
  Components are run only once.
  The `createMemo` function is the primitive used
  to create a signal from an async function.

- Solid JS uses proxy-based reactivity for stors and props,
  it is therefore important to not destructure props or state objects.

- Solid JS does not re-render the entire component on state change,
  so derived state should be computed via `createMemo`,
  or by creating a new signal that depends on the original state.

# Symbolic maths and exercises

These instructions are important when directed to create an exercise
or do symbolic maths manipulations.

- CAS manipulations are done via `expr` from `@learning/core`.
  It works by supplying MathJSON or latex to `expr` (e.g. `expr('x^2')`)
  and returns an object with methods for manipulation and rendering.
  As much as possible,
  use `expr` for all symbolic maths manipulations and rendering.
  For rendering, use the `tex` tagged literal from `@learning/core`.
  If a CAS manipulation would make sense but is not supported by `expr`,
  or would be verbose to the point of hurting readability,
  invite them to contact the maintainers to add the feature,
  and do not implement it yourself.
  Do not modify @learning/core without being explicitely asked to do so,
  and do not write spagghetti code to work around missing features in `expr`.

- Write `x_0` instead of `x0`.
  The CAS interprets the latter as a multiplication of `x` and `0`.

- For readability, avoid `*` in CAS manipulations when you can simply use a space.

- For CAS manipulations,
  use `subs` for substitutions instead of doing it directly in the tex string.
  For example,
  prefer `expr('(x + a)^2').subs({x: sample([-1, 1])})` over `expr('(x + ${sample([-1, 1])})^2')`,
  as brackets could be forgotten.

- All LaTeX rendering in JSX is done
  via the `tex` tagged literal from `@learning/core`.
  It supports expressions object created by `expr` and raw LaTeX strings.
  Try to stay concise and avoid `.latex()` where possible.
  For example, prefer {tex`${expr('x^2')}`} over {tex`${expr('x^2').latex()}`}.

- `@learning/exercises` provides pre-built exercise components.
  Use the predefined components as much as possible,
  and use the `Exercise` component from `@learning/core`
  only when the predefined components do not fit the needs.

- With the `Exercise` component from `@learning/core`,
  add the `'use server'` directive (first line of the function body) for the `grade` prop,
  and mark the function as `async`, even if there is no asynchronous code in the grading logic.

  ```tsx
    <Exercise
      ...
      grade={async (props) => {
        'use server'
        // grading logic here
      }}
    />
  ```

- In exercises, don't show the answer.
  The whole point is to provide symbolic grading for the students.
  Also, avoid using hardcoded values as much as possible in `Exercise`,
  as that is what `params` are for.

- In exercises, avoid numeric calculations as much as possible.

- Only destructure objects in the `grade` prop of all exercise components.
  Remember that you could lose reactivity if you destructure props in a reactive context.

- For `Exercise` again,
  avoid using the `input` props if there is only one field.
  By default, the one field will be named `attempt`.

- When asked to create exercise with parameters,
  Use the `Generate` component from `@learning/core`
  unless it is for `Exercise`,
  in which case try to use the `params` prop first.

# Resources creation (/apps folder)

- Use good semantic HTML in the documents, and in the exercises.

- Titles should use the `Heading` component from `@learning/components`,
  and not `h1`, `h2`, etc. directly,
  to make sure the table of contents is generated correctly.
