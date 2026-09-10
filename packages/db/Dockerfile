FROM oven/bun:1.4.1
WORKDIR /app
COPY package.json bun.lock ./
COPY --parents apps/*/package.json packages/*/package.json ./
RUN bun install --frozen-lockfile --filter '@learning/db'

COPY /packages/db/ packages/db/