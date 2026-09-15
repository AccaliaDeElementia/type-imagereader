'use sanity'

// Asserts that the Node and npm versions running this process match the exact
// versions pinned in `package.json` engines, that the Dockerfile's NODE_VERSION
// ARG default matches engines.node, that the declared @types/node major matches
// it too, and that the sqlite client named in knexfile.json is actually
// installed. Catches:
//  - the dev container drifting ahead of the production container (cryptic
//    `npm ci` lockfile errors at deploy time);
//  - someone editing the Dockerfile's NODE_VERSION without updating engines.node
//    (or vice versa);
//  - @types/node describing a different Node major than the one that runs,
//    which type-checks clean while silently modelling the wrong runtime;
//  - the sqlite driver missing from node_modules, which otherwise surfaces as a
//    wall of failures inside the sqlite integration and startup-smoke specs
//    long after `npm ci` reported success.
//
// `.npmrc engine-strict=true` enforces engines on installed *dependencies* only;
// this script is the strict gate for the project's *own* engines field.

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const INVALID_ARG_EXIT_CODE = 2

interface PkgEngines {
  node: string
  npm: string
}
interface Pkg {
  engines?: Partial<PkgEngines>
  devDependencies?: Record<string, string>
}

interface Knexfile {
  sqlite?: { client?: string }
}

// Range characters per node-semver. An "exact" pin is just `MAJOR.MINOR.PATCH`
// with no operators; anything else would let npm install -g pick whatever the
// latest matching version is at build time, defeating reproducibility.
const RANGE_CHARS = /[\^~*<>=\s\|x]/v

const DOCKERFILE_NODE_ARG = /^ARG\s+NODE_VERSION=(?<version>\S+)\s*$/mv

const NODE_TYPES_PACKAGE = '@types/node'

const LEADING_MAJOR_VERSION = /^\D*(?<major>\d+)\./v

export interface CheckEnvInput {
  pkg: Pkg
  dockerfile: string | null
  knexfile: Knexfile | null
  canResolveModule: (moduleName: string) => boolean
  actualNode: string
  actualNpm: string
}

export interface CheckEnvResult {
  problems: readonly string[]
}

function validateEngines(engines: Pkg['engines']): { ok: false; problem: string } | { ok: true; pinned: PkgEngines } {
  if (typeof engines?.node !== 'string' || typeof engines.npm !== 'string') {
    return { ok: false, problem: 'package.json engines.node and engines.npm must both be set' }
  }
  if (RANGE_CHARS.test(engines.node) || RANGE_CHARS.test(engines.npm)) {
    return { ok: false, problem: 'engines.node and engines.npm must be exact versions, not ranges' }
  }
  return { ok: true, pinned: { node: engines.node, npm: engines.npm } }
}

function compareRuntime(actual: { node: string; npm: string }, pinned: PkgEngines): readonly string[] {
  const out: string[] = []
  if (actual.node !== pinned.node) out.push(`  node: required ${pinned.node}, running ${actual.node}`)
  if (actual.npm !== pinned.npm) out.push(`  npm:  required ${pinned.npm}, running ${actual.npm}`)
  return out
}

function compareDockerfile(dockerfile: string | null, requiredNode: string): readonly string[] {
  if (dockerfile === null) return []
  const match = DOCKERFILE_NODE_ARG.exec(dockerfile)
  if (match === null) return ['  Dockerfile: ARG NODE_VERSION line not found']
  /* istanbul ignore next -- the regex has a named `version` group so this can't fire in practice; TS just can't prove it. */
  const declared = match.groups?.version ?? ''
  if (declared !== requiredNode) {
    return [`  Dockerfile NODE_VERSION: required ${requiredNode}, declared ${declared}`]
  }
  return []
}

function majorVersionOf(version: string): string | null {
  const match = LEADING_MAJOR_VERSION.exec(version)
  if (match === null) return null
  /* istanbul ignore next -- the regex has a named `major` group so this can't fire in practice; TS just can't prove it. */
  return match.groups?.major ?? null
}

function compareNodeTypes(declaredRange: string | undefined, requiredNode: string): readonly string[] {
  if (declaredRange === undefined) return []
  const declaredMajor = majorVersionOf(declaredRange)
  if (declaredMajor === null) {
    return [`  ${NODE_TYPES_PACKAGE}: cannot read a major version from "${declaredRange}"`]
  }
  const requiredMajor = majorVersionOf(requiredNode)
  if (declaredMajor !== requiredMajor) {
    return [
      `  ${NODE_TYPES_PACKAGE}: major ${declaredMajor} does not match engines.node major ${requiredMajor} (${requiredNode})`,
    ]
  }
  return []
}

function checkSqliteDriver(
  knexfile: Knexfile | null,
  canResolveModule: (moduleName: string) => boolean,
): readonly string[] {
  if (knexfile === null) return []
  const client = knexfile.sqlite?.client
  if (client === undefined) return ['  knexfile.json: sqlite.client is not set']
  if (!canResolveModule(client)) {
    return [`  ${client}: knexfile.json names it as the sqlite client but it does not resolve`]
  }
  return []
}

export function checkEnv(input: CheckEnvInput): CheckEnvResult {
  const enginesResult = validateEngines(input.pkg.engines)
  if (!enginesResult.ok) return { problems: [enginesResult.problem] }
  const runtimeProblems = compareRuntime({ node: input.actualNode, npm: input.actualNpm }, enginesResult.pinned)
  const dockerfileProblems = compareDockerfile(input.dockerfile, enginesResult.pinned.node)
  const nodeTypesProblems = compareNodeTypes(input.pkg.devDependencies?.[NODE_TYPES_PACKAGE], enginesResult.pinned.node)
  const sqliteProblems = checkSqliteDriver(input.knexfile, input.canResolveModule)
  return { problems: [...runtimeProblems, ...dockerfileProblems, ...nodeTypesProblems, ...sqliteProblems] }
}

/* istanbul ignore next -- helper for the CLI wrapper. */
function isENOENT(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'ENOENT'
}

/* istanbul ignore next -- helper for the CLI wrapper. */
function readDockerfileIfPresent(): string | null {
  try {
    return readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8')
  } catch (err) {
    if (isENOENT(err)) return null
    throw err
  }
}

/* istanbul ignore next -- helper for the CLI wrapper; does real fs IO. */
function readKnexfileIfPresent(): Knexfile | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- reading our own knexfile; runtime validation isn't worth it.
    return JSON.parse(readFileSync(new URL('../knexfile.json', import.meta.url), 'utf8')) as Knexfile
  } catch (err) {
    if (isENOENT(err)) return null
    throw err
  }
}

/* istanbul ignore next -- helper for the CLI wrapper; probes the real module graph. */
function canResolveModule(moduleName: string): boolean {
  try {
    createRequire(import.meta.url).resolve(moduleName)
    return true
  } catch {
    return false
  }
}

/* istanbul ignore next -- CLI wrapper around the unit-tested `checkEnv()` function; does real fs/process IO. */
export function main(): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- reading our own package.json; runtime validation isn't worth it.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as Pkg
  const dockerfile = readDockerfileIfPresent()
  const knexfile = readKnexfileIfPresent()
  const actualNode = process.version.replace(/^v/v, '')
  const actualNpm = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim()
  const { problems } = checkEnv({ pkg, dockerfile, knexfile, canResolveModule, actualNode, actualNpm })
  if (problems.length > 0) {
    console.error('check:env: environment does not match the pinned toolchain:')
    for (const line of problems) console.error(line)
    console.error('')
    console.error('Update package.json engines, the Dockerfile, or the @types/node range so they')
    console.error('all agree, and install the matching local toolchain. A driver that does not')
    console.error('resolve usually means `npm ci` ran without devDependencies.')
    process.exit(INVALID_ARG_EXIT_CODE)
  }
}

/* istanbul ignore next -- entry-point detection only fires in CLI invocation. */
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
