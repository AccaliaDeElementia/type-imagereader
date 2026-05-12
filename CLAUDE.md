# Project conventions

## Naming style

The project follows standard TypeScript naming conventions (per the de-facto consensus across the TS ecosystem: TypeScript compiler codebase, Microsoft TS handbook, Google TS style guide).

| Element                                                               | Style                                                                    | Example                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| File names — modules                                                  | `camelCase`                                                              | `apiFunctions.ts`, `findItems.ts`                   |
| File names — class-home files                                         | `PascalCase` only when the file's primary purpose is exporting one class | (rare in this codebase)                             |
| Functions — all                                                       | `camelCase`                                                              | `initialize()`, `syncAllPictures()`, `isPostgres()` |
| Classes                                                               | `PascalCase`                                                             | `ImageData`, `LockResource`                         |
| Class methods                                                         | `camelCase`                                                              | `imageData.rescale()`, `lockResource.take()`        |
| Class properties                                                      | `camelCase`                                                              | `firstName`, `socketId`                             |
| Local variables                                                       | `camelCase`                                                              | `userName`, `pageCount`                             |
| Module-level true constants (immutable primitives or frozen literals) | `UPPER_SNAKE_CASE`                                                       | `DEFAULT_PORT = 3030`                               |
| Types & interfaces                                                    | `PascalCase`, no `I` prefix                                              | `User`, `WeatherResults`                            |
| Enums                                                                 | `PascalCase` name + `PascalCase` members                                 | `LogLevel.Debug`                                    |
| Namespace-style container objects                                     | `PascalCase`                                                             | `Imports`, `Internals`, `Config`, `CacheStorage`    |

Type guards and predicates follow the function rule (`camelCase`) regardless of their `is`/`has`/`can` prefix: `isOpenWeatherData`, `hasValue`, `isPostgres`.

## Structural conventions (the `Imports` / `Internals` / state-singleton pattern)

Every module that has stub seams or non-trivial state organizes them into well-known buckets so tests can locate them without reading the source:

### `Imports` — cross-module stub seam

```ts
export const Imports = {
  knex, // npm or node deps
  readFile,
  initialize: _initialize, // functions imported from another project module
}
```

Tests stub via `sandbox.stub(Imports, 'knex')`. Production code in this module calls `Imports.knex(…)`. Never reach into another module's `Imports`/`Internals` (enforced by `no-restricted-imports` ESLint rule for non-test code).

### `Internals` — within-module stub seam

```ts
export function syncAllPictures(knex) {
  await Internals.syncNewPictures(knex)
  await Internals.syncRemovedPictures(knex)
}
export const Internals = { syncNewPictures, syncRemovedPictures }
```

Use `Internals` only for functions that other functions in the same module call AND that tests stub to verify dispatch behavior. If neither condition holds, just export the named function directly without listing it in `Internals`.

### State singleton — module-natural cognate name

```ts
export const Persistence = { initializer: undefined as Promise<Knex> | undefined }
```

Hold mutable module state here. Field names are `camelCase`. Container name is `PascalCase`, typically the module's name capitalized (`Persistence`, `Filewatcher`, `Helpers`, `Weather`, `Config`, `CacheStorage`).

### Compound state-singleton-with-methods (exception)

A few singletons hold both state and intentionally-coupled methods (`ModCount`, `ImageReader`, `WebSockets`). Keep these as compound containers rather than splitting; the public/internal API surface is the documentation.

## Module-level rules

- `'use sanity'` directive at the top of every source `.ts` file (excluding ambient `.d.ts` and tool configs).
- No `export default` in source code. (Tool configs like `vitest.config.ts` are exempt — their tooling requires it.)
- Prefer `export function name(…)` over `export const name = (…) => …` for declarations.
- Cross-module imports always use named imports: `import { foo } from './bar.js'`. Avoid `import * as`.

## Lint rule exceptions

Leave ESLint rules in place when practical. Override them inline (with a `--` reason) only when the rule hides the intent of the code rather than improving it.

- **`no-await-in-loop`** — override when the loop is _deliberately serialized_ (e.g., polling for an HTTP endpoint to come up, processing items where iteration N depends on iteration N-1, avoiding a race condition that parallelism would introduce). Use a block-scoped disable with a reason: `/* eslint-disable no-await-in-loop -- polling is intentionally serial */` … `/* eslint-enable no-await-in-loop */`. Don't refactor to recursion just to dodge the rule — that hides the polling/serial semantics behind a less obvious control flow.

## Testing conventions

- One `Sinon.createSandbox()` per `describe` block; restore in `afterEach`.
- `Imports.stub()` calls only inside hooks (`beforeEach`/`it`), never at describe scope (enforced by `local/no-method-stub-outside-hook`).
- Single assertion per `it()` block.
- Each spec file should target one module: at most one `Imports`/`Internals` import path per spec.

### Two-pronged stub strategy

Tests isolate the SUT from its dependencies in one of two ways depending on what the dependency is:

- **Cross-module / npm / node deps → `Imports`.** Anything the module imports (other project modules, npm packages, node builtins) goes through the module's `Imports` container so tests can swap it via `sandbox.stub(Imports, 'foo')`. This is the dominant pattern.
- **Runtime globals → patch the global directly.** Browser/DOM/node globals (`window.fetch`, `window.setInterval`, `globalThis.crypto`, etc.) are not imports and don't fit in `Imports`. Patch them via `sandbox.stub(global, 'fetch')` or by assigning onto the test's `dom.window` instance. Don't try to wrap globals in `Imports` to dodge the pattern — the global IS the seam.

The `PubSub` primitives (`subscribe`/`publish`/`forward`/`defer`/`addInterval`/`removeInterval`) follow rule 1: import them through your module's `Imports` and stub there. Direct `PubSub` access from production or test code is blocked by `no-restricted-imports`; a small allowlist (the pubsub primitive specs, the pubsub testutil spec, the client-init integration spec, and `testutils/pubsub.ts` itself) is the only place that touches `PubSub` directly. Spec state inspection goes through the pubsub testutils (`resetPubSub`, `mountPubSub`, `capturedSubscriber`, `publishedData`, `capturedInterval`, `capturedDeferred`). The runtime `mountPubSub` guard enforces this at test execution time — the ESLint allowlist (`eslint.config.mjs`) and the runtime guard's `GUARD_EXCLUDED_PATHS` (`testutils/pubsub.ts`) must be kept in sync.

## Operational notes

- `npm test` runs prettier + lint + typecheck + vitest. Redirect to `run.log` when iterating: `npm test 2>&1 | tee run.log`.
- Coverage threshold is 100% across statements/branches/functions/lines (istanbul).
