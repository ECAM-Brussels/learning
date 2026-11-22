# About this course "Matrices"

This course of Matrices is a part of a bigger course called
"Fondamental Mathematics for Artificial Intelligence" (IA1M).
This course is intended for 1st year Bachelor students in engineering.
They previously had a basic, univariate Calculus course.

For this Matrices course, I have 7 lessons of 90 minutes each,
plus 3 exercise sessions of 90 minutes each.

You can find more details in the file IA1M/index.mdx

# Formatting

## Line cut

I want the lines to be cut, in order to have no lines longer than 80 characters.
This is useful to track changes on Github.

For text, you can cut after a comma or a point or a double point.
For a formula, especially for matrices, do something like this:

{tex`
\mathbf{x}=\begin{bmatrix}
x_1 \\
\vdots \\
x_n
\end{bmatrix}`}

instead of

{tex`\mathbf{x}=\begin{bmatrix} x_1 \\ \vdots \\ x_n \end{bmatrix}`}

## Inline formulas

Never leave an inline formula alone on its own line.
In MDX, a line containing only a `{...}` expression becomes a separate block,
so the formula is taken out of its sentence.
Keep at least one word or punctuation mark on the same line,
and put punctuation after the formula, not inside it:

We can use this linear form to write a linear equation:
{tex`y(\mathbf{x})=\mathbf{\tilde{w}}^T\mathbf{\tilde{x}}=0`}.

instead of

We can use this linear form to write a linear equation:
{tex`y(\mathbf{x})=\mathbf{\tilde{w}}^T\mathbf{\tilde{x}}=0.`}
