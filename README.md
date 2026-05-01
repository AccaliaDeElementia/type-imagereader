# type-imageReader

A self-hosted web app for browsing large local collections of images and comics. It indexes a folder tree on disk into PostgreSQL, then serves a paginated browser, a real-time multi-device slideshow, bookmarks, and per-image read/unread tracking. A TypeScript reimplementation of [node-imagereader](https://github.com/AccaliaDeElementia/node-imagereader).

## Features

- **Folder browser** — paginated tree view over a mounted image library (`/show/*`), with cover images derived from the first picture in each folder.
- **Slideshow** — `/slideshow/*` runs an auto-advancing slideshow per folder. Multiple clients in the same room stay in sync over Socket.IO; prev/next on one device updates all of them.
- **Read tracking** — viewed images are marked seen; folder counts roll up to ancestors. Unread images are prioritised in slideshow ordering.
- **Bookmarks** — persistent per-image bookmarks via `/api/bookmarks`.
- **On-the-fly image scaling** — Sharp resizes to preview (240×320), kiosk (1280×800), or arbitrary `/images/scaled/:w/:h/...` sizes, all served as WebP with an LRU cache.
- **Filesystem sync** — full filesystem walk on startup loads the configured library directory into PostgreSQL via `COPY`. A `@parcel/watcher` subscription debounces live changes for incremental sync, with a periodic full re-scan as a backstop.
- **Optional weather overlay** — slideshow shows current conditions and sunrise/sunset from OpenWeatherMap when configured.

## Stack

Node.js 24+, TypeScript, Express 5, Pug, Socket.IO, Knex + PostgreSQL, Sharp, `@parcel/watcher`. Client bundle built with esbuild; styles compiled with Sass. Tests run on Mocha + Chai + Sinon under c8 (100% coverage gate).

## Requirements

- Node.js 24 or newer
- PostgreSQL (the default `knexfile.json` connects to host `postgres`, db `postgres`, user `postgres`, password `password` — override via env vars below)
- An image library at the path specified by `DATA_DIR` (defaults to `/data`). The directory must exist and be a directory at startup or the server will exit with a failure.

## Configuration

All configuration is via environment variables. A `.env` file in the project root is loaded at startup.

### Database (override `knexfile.json`)

| Variable      | Default       | Notes                                                                                |
| ------------- | ------------- | ------------------------------------------------------------------------------------ |
| `DB_CLIENT`   | `development` | Selects the block in `knexfile.json` (`development`, `postgresql`, or `sqlite`).     |
| `DB_HOST`     | from knexfile | PostgreSQL host.                                                                     |
| `DB_DATABASE` | from knexfile | Database name.                                                                       |
| `DB_USER`     | from knexfile | Username.                                                                            |
| `DB_PASSWORD` | from knexfile | Password.                                                                            |
| `DB_FILENAME` | from knexfile | SQLite database file path (defaults to `./database.sqlite3` for the `sqlite` block). |

Migrations run automatically on first DB connection — see [migrations/](migrations/).

PostgreSQL is the primary target. SQLite (via `better-sqlite3`) is supported for single-user setups; the COPY-based bulk-load path falls back to chunked `INSERT`s, so initial sync is significantly slower on large libraries. The `better-sqlite3` driver is listed in `optionalDependencies`, so `npm install` will fetch it automatically when the platform supports it; if you skipped optional deps, install it explicitly with `npm install better-sqlite3`.

#### SQLite recommended library size

Library size has a steep effect on SQLite performance — chunked `INSERT` bulk loads, the whole-database write lock, and disk page-cache pressure all scale unfavourably. Indicative numbers from production (one library, one disk):

| Picture count | Initial sync | DB file size | Experience                         |
| ------------: | -----------: | -----------: | ---------------------------------- |
|       100,000 |        ~35 s |       ~80 MB | Comfortable                        |
|       250,000 |        ~85 s |      ~200 MB | Tolerable on first run             |
|       500,000 |       ~3 min |      ~400 MB | Painful first run; OK steady-state |
|     1,000,000 |       ~6 min |      ~800 MB | First run feels broken             |
|     2,300,000 |      ~13 min |       1.8 GB | Migrate to PostgreSQL              |

Two recommended ceilings for the SQLite backend:

- **Soft limit: 100,000 pictures.** Below this, the experience matches PostgreSQL closely. Above it, performance degrades steadily as the library grows.
- **Firm limit: 250,000 pictures.** Above this, the initial sync and the periodic 24-hour full re-sync take long enough to be a real operational concern. **PostgreSQL is strongly recommended past this point.**

Neither limit is enforced — both produce a one-time startup warning in the standard debug log (visible with `DEBUG=type-imagereader:*`) and the app continues normally.

### Server

| Variable   | Default | Notes                                                                                                                                         |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`     | `3030`  | HTTP listen port (must be an integer 0–65535).                                                                                                |
| `DATA_DIR` | `/data` | Absolute path to the image library to serve and index. Validated at startup — startup fails if the path does not exist or is not a directory. |
| `NODE_ENV` | unset   | `production` enables Helmet; `development` enables Morgan request logging.                                                                    |
| `DEBUG`    | unset   | Set to `type-imagereader:*` to see internal logs.                                                                                             |

### Sync

| Variable          | Default                    | Notes                                                                                              |
| ----------------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
| `SKIP_SERVE`      | `0`                        | If `1`/`true`, skip starting the HTTP server (sync-only mode).                                     |
| `SKIP_SYNC`       | `0`                        | If `1`/`true`, skip the filesystem sync (serve-only mode).                                         |
| `ONESHOT`         | `0`                        | If `1`/`true`, run a single full sync, release the DB pool, and exit. Combine with `SKIP_SERVE=1`. |
| `DISABLE_WATCHER` | `0`                        | If `1`/`true`, run only the periodic full sync — no live filewatcher.                              |
| `SYNC_INTERVAL`   | 3 h (or 24 h with watcher) | Interval between full re-scans, in milliseconds.                                                   |

### Weather overlay (optional)

| Variable               | Required | Notes                                                                  |
| ---------------------- | -------- | ---------------------------------------------------------------------- |
| `OPENWEATHER_APPID`    | yes      | OpenWeatherMap API key. Without it, the weather overlay is disabled.   |
| `OPENWEATHER_LOCATION` | yes      | e.g. `London,UK`.                                                      |
| `NIGHT_NOT_BEFORE`     | no       | `HH:MM` — earliest the slideshow treats it as night (default `21:00`). |
| `NIGHT_NOT_AFTER`      | no       | `HH:MM` — latest the slideshow treats it as night (default `06:15`).   |

## Running locally

```bash
npm install
npm run build              # bundles client JS, compiles SCSS, type-checks
npm start                  # full app: HTTP server + filesystem sync + watcher
```

Other run modes (all source-run via `ts-node`):

```bash
npm run dev                # same as start, after a rebuild
npm run dev:serve          # serve only — no filesystem sync (SKIP_SYNC=1)
npm run dev:watch          # sync only — no HTTP server (SKIP_SERVE=1)
npm run dev:scan           # one-shot full scan, then exit (SKIP_SERVE=1 ONESHOT=1)
```

The app indexes images from `DATA_DIR` (default `/data`). For local development outside Docker, point it at your library:

```bash
DATA_DIR=/home/me/comics npm start
```

## Running in Docker

The included [Dockerfile](Dockerfile) is a two-stage build: stage one runs `npm test && npm run build`, stage two ships a lean runtime image as the `node` user.

```bash
docker build -t type-imagereader .
docker run --rm \
  -p 3030:3030 \
  -v /path/to/your/images:/data \
  -e DB_HOST=postgres -e DB_DATABASE=postgres \
  -e DB_USER=postgres -e DB_PASSWORD=password \
  -e OPENWEATHER_APPID=... -e OPENWEATHER_LOCATION='London,UK' \
  --link some-postgres:postgres \
  type-imagereader
```

The image declares a `VOLUME /data` and the app reads from there by default. If you mount the library somewhere else inside the container, pass `DATA_DIR=/your/mount/point` so the app reads from it.

A health check is registered on `GET /api/healthcheck`.

## HTTP routes

| Route                                       | Description                                                   |
| ------------------------------------------- | ------------------------------------------------------------- |
| `GET /`                                     | Redirects to `/show`.                                         |
| `GET /show/*path`                           | Folder browser.                                               |
| `GET /slideshow/*path`                      | Slideshow view (joins a Socket.IO room scoped to the folder). |
| `GET /api/listing/*path`                    | JSON folder listing.                                          |
| `GET /api/bookmarks`                        | List bookmarks.                                               |
| `POST /api/bookmarks/add` \| `/remove`      | Manage bookmarks.                                             |
| `POST /api/mark/read` \| `/unread`          | Mark a folder seen / unseen.                                  |
| `POST /api/navigate/latest`                 | Record the most recently viewed image.                        |
| `GET /api/healthcheck`                      | Returns `OK`.                                                 |
| `GET /images/full/*path`                    | Original image bytes.                                         |
| `GET /images/preview/*path-image.webp`      | 240×320 WebP.                                                 |
| `GET /images/scaled/:w/:h/*path-image.webp` | Custom-size WebP.                                             |
| `GET /images/kiosk/*path-image.webp`        | 1280×800 WebP, LRU-cached.                                    |
| `GET /weather`                              | Latest cached OpenWeather payload.                            |

## Development

```bash
npm run lint               # eslint
npm run pretty             # prettier --write
npm run typecheck          # tsc --build
npm test                   # lint + typecheck + c8/mocha (100% coverage gate)
npm run test:detailed      # spec reporter
npm run knex -- ...        # invoke knex CLI against knexfile.json
```

Path aliases (`#routes/*`, `#utils/*`, `#contracts/*`, `#public/*`, `#testutils/*`, `#Server`, `#app`) are declared in `package.json#imports`.

## License

[MIT](LICENSE) — Accalia Elementia.
