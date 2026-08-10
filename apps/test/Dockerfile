FROM oven/bun AS base
WORKDIR /app
COPY package.json bun.lock ./
COPY --parents apps/*/package.json packages/*/package.json ./
RUN bun install --frozen-lockfile --filter '@learning/test'
COPY tsconfig.json ./
COPY packages/ packages/
COPY apps/test/ apps/test/

FROM base AS dev
CMD ["bun", "run", "--filter", "@learning/test", "dev", "--host"]

FROM base AS build
RUN bun run --filter @learning/test build

FROM oven/bun AS prod
WORKDIR /app
COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/test/package.json ./apps/test/package.json
COPY --from=build /app/apps/test/dist ./apps/test/dist
WORKDIR /app/apps/test
CMD ["bunx", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]