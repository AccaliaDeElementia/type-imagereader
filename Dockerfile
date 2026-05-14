# syntax=docker/dockerfile:1.7
# Must match package.json engines.node. scripts/checkEnv.mjs (run during npm test)
# validates that this string matches engines.node — drift fails the build.
ARG NODE_VERSION=24.12.0

# ── Stage 1: install full deps, run tests, build assets ──
FROM docker.io/library/node:${NODE_VERSION}-slim AS build
WORKDIR /app
# COPY package.json alone so the npm pin step is cached separately from the
# lockfile install. npm pin is read FROM package.json — single source of truth.
COPY package.json ./
RUN npm install -g npm@$(node -p "require('./package.json').engines.npm")
COPY package-lock.json .npmrc ./
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

COPY --chown=node:node package.json ./
RUN npm install -g npm@$(node -p "require('./package.json').engines.npm")
COPY --chown=node:node package-lock.json .npmrc ./
RUN npm ci --omit=dev
COPY --chown=node:node . .
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3030/tcp
VOLUME /data

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s CMD \
  node -e "fetch('http://localhost:3030/api/healthcheck').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
