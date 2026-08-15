FROM oven/bun:1.3.5 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY --parents apps/*/package.json packages/*/package.json ./
RUN bun install --frozen-lockfile --filter '@learning/test'


FROM deps AS dev
COPY tsconfig.json ./
COPY packages/ packages/
COPY apps/test/ apps/test/
CMD ["bun", "run", "--filter", "@learning/test", "dev", "--host"]


FROM deps AS build
COPY tsconfig.json ./
COPY packages/ packages/
COPY apps/test/ apps/test/
RUN bun run --filter '@learning/test' build


FROM deps AS prod
COPY --from=build /app/apps/test/server.ts ./apps/test/server.ts
COPY --from=build /app/apps/test/dist ./apps/test/dist
COPY --from=build /app/packages ./packages
WORKDIR /app/apps/test

CMD ["bun", "run", "server.ts"]