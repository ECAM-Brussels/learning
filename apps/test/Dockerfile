FROM oven/bun

WORKDIR /app

COPY package.json bun.lock ./
COPY --parents apps/*/package.json packages/*/package.json ./
RUN bun install --frozen-lockfile --filter '@learning/test'

COPY tsconfig.json ./
COPY packages/ packages/
COPY apps/test/ apps/test/
CMD ["bun", "run", "--filter", "@learning/test", "dev", "--host"]