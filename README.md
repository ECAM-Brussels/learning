# Learning

[![codecov](https://codecov.io/gh/ECAM-Brussels/learning/graph/badge.svg?token=V6LLJII67E)](https://codecov.io/gh/ECAM-Brussels/learning)
[![Tests](https://github.com/ECAM-Brussels/learning/actions/workflows/tests.yaml/badge.svg)](https://github.com/ECAM-Brussels/learning/actions/workflows/tests.yaml)

_Learning_ is an open-source platform for interactive mathematics and science courses.
Its exercise engine grades answers symbolically,
so that $(x - 2)(x - 3)$ and $x^2 - 5x + 6$ are recognised as equal,
generates randomised questions, and guides students step by step when they get stuck.
Courses are written in MDX, with interactive figures (JSXGraph) and Python run in the browser (Pyodide).

It is used for courses at [ECAM Brussels](https://www.ecam.be),
so course content is in French.

## Getting started

The simplest way is the dev container, which has everything installed:

1. Install [Docker](https://www.docker.com/products/docker-desktop/) and [Visual Studio Code](https://code.visualstudio.com/).
2. Open the repository in VS Code and choose **Reopen in Container**.
3. Copy `.env.example` to `.env` and fill in the blanks (see [Environment](#environment)).
4. In the container's terminal, run `bun dev`.

To work without the container, install [Bun](https://bun.com/), [uv](https://docs.astral.sh/uv/) and Docker,
then follow steps 3 and 4.

`bun dev` installs the dependencies, starts PostgreSQL in Docker and applies the schema,
then runs the site on <http://localhost:3000>, SymAPI on port 8088, and every test suite in watch mode.
The site's `/doc` pages explain how to write courses and exercises.

## Environment

`.env.example` lists these variables with values for development.

| Variable                                            | Purpose                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `SYMAPI_URL`                                        | SymAPI's address, `http://localhost:8088` in development                              |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credentials of the PostgreSQL container                                               |
| `DATABASE_URL`                                      | Connection string to that database, e.g. `postgres://user:password@localhost:5432/db` |
| `BETTER_AUTH_URL`                                   | The site's address, `http://localhost:3000` in development                            |
| `BETTER_AUTH_SECRET`                                | A random string, e.g. from `openssl rand -base64 32`                                  |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`    | Sign-in with Microsoft accounts (an app registration in Microsoft Entra ID)           |
| `ADMINS`                                            | Comma-separated emails of the users who get the admin role                            |

## Scripts

| Command                       | What it does                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `bun dev`                     | Development servers and tests in watch mode                                             |
| `bun run test`                | Every test suite once                                                                   |
| `bun run typecheck`           | Type-checks the whole repository, MDX included                                          |
| `bun run lint`                | Fixes and formats the code (`lint:check` only checks)                                   |
| `bun run codegen`             | Regenerates SymAPI's TypeScript types from a running SymAPI                             |
| `bun run db:start`, `db:push` | Starts PostgreSQL, applies the schema                                                   |
| `bun run docker`              | Builds and runs the production stack with Docker Compose (`docker:dev` for development) |

A pre-commit hook (lefthook) runs ESLint, Prettier, Black and the type checker on staged files.

## Repository

| Folder                         | Contents                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `apps/ecam`                    | The site and its courses (SolidJS, Vite, MDX)                                    |
| `apps/symapi`                  | SymAPI, a FastAPI service that answers what the browser can't decide, with SymPy |
| `packages/core`                | The exercise engine: steps, sequences, question banks, symbolic expressions      |
| `packages/exercises`           | Reusable exercises, by subject (algebra, calculus, numerical methods, Python)    |
| `packages/components`          | Interface components, including declarative JSXGraph figures                     |
| `packages/mdx`                 | The MDX pipeline, including slide decks                                          |
| `packages/repl`                | Python in the browser, with Pyodide                                              |
| `packages/db`, `packages/auth` | Database schema (Drizzle) and authentication (Better Auth)                       |

Coding agents should read [AGENTS.md](AGENTS.md) first.
