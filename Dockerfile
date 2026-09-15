# syntax=docker/dockerfile:1.7
# Must match package.json engines.node. The bundled npm in these node images must
# also match engines.npm — verify with `docker run --rm node:${NODE_VERSION}-slim npm --version`
# when bumping. tools/checkEnv.ts (run during npm test) validates NODE_VERSION
# matches engines.node — drift fails the build.
ARG NODE_VERSION=26.1.0

# ── Stage 1: install full deps, run tests, build assets ──
FROM docker.io/library/node:${NODE_VERSION}-slim AS build
WORKDIR /app
# node-gyp prerequisites, needed only while installing. better-sqlite3 13.x
# ships N-API prebuilds and sets `gypfile: false` to tell npm not to build it,
# but npm runs `node-gyp rebuild` on it here anyway and -slim has no python3,
# so configure dies with "Could not find any Python installation". That rebuild
# is a no-op — 13.x only compiles under `--force_build=1`, so plain `node-gyp
# rebuild` just touches stamp targets — meaning python3 and make are enough to
# satisfy it; g++ is carried as headroom in case a future bump really compiles.
# Deleted in the same layer, and this stage is discarded regardless.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm test && npm run build

# ── Stage 2: lean runtime image ──
FROM docker.io/library/node:${NODE_VERSION}-slim AS runtime
LABEL maintainer="docker@elementia.me"

ENV NODE_ENV=production \
    DB_CLIENT=postgresql \
    DB_HOST=postgresql \
    DB_DATABASE=postgresql \
    DB_USER=postgresql \
    DB_FILENAME=docker_database.sqlite3 \
    OPENWEATHER_LOCATION='London,UK'

WORKDIR /app
RUN mkdir -p /data && chown node:node /data /app

COPY --chown=node:node package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev
COPY --chown=node:node . .
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3030/tcp
VOLUME /data

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s CMD \
  node -e "fetch('http://localhost:3030/api/healthcheck').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
