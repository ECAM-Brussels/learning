FROM oven/bun:1.3.5 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY --parents apps/*/package.json packages/*/package.json ./
RUN bun install --frozen-lockfile --filter '@learning/ecam'


FROM deps AS dev
COPY tsconfig.json ./
COPY packages/ packages/
COPY apps/ecam/ apps/ecam/
CMD ["bun", "run", "--filter", "@learning/ecam", "dev", "--host"]


FROM deps AS build
COPY tsconfig.json ./
COPY packages/ packages/
COPY apps/ecam/ apps/ecam/
RUN bun run --filter '@learning/ecam' build


FROM deps AS prod
COPY --from=build /app/apps/ecam/server.ts ./apps/ecam/server.ts
COPY --from=build /app/apps/ecam/dist ./apps/ecam/dist
COPY --from=build /app/packages ./packages
WORKDIR /app/apps/ecam

CMD ["bun", "run", "server.ts"]