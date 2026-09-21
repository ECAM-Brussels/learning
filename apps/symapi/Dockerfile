FROM ghcr.io/astral-sh/uv:alpine3.22 AS dev
EXPOSE 8000
WORKDIR /app
COPY pyproject.toml uv.lock* ./
RUN uv sync
COPY . .
CMD ["uv", "run", "fastapi", "dev", "main.py", "--host", "0.0.0.0"]

FROM dev AS prod
ENV WORKERS=4
CMD ["sh", "-c", "uv run fastapi run main.py --workers ${WORKERS}"]
