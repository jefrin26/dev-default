FROM debian:trixie-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PORT=8080 \
    DATA_DIR=/app/data

# Debian Trixie ships Node 20 + npm 9, which is enough for Vite 6 and Express 5.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nodejs \
        npm \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build dependencies are needed for `npm run build`, then pruned below.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY src/ ./src/
COPY server/ ./server/

RUN npm run build \
    && npm prune --omit=dev \
    && useradd --uid 1000 --create-home app \
    && mkdir -p /app/data \
    && chown -R app:app /app

ENV NODE_ENV=production

USER app
EXPOSE 8080

CMD ["node", "server/index.js"]
