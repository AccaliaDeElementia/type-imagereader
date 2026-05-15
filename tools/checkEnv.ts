'use sanity'

// Asserts that the Node and npm versions running this process match the exact
// versions pinned in `package.json` engines, and that the Dockerfile's
// NODE_VERSION ARG default matches engines.node. Catches:
//  - the dev container drifting ahead of the production container (cryptic
//    `npm ci` lockfile errors at deploy time);
//  - someone editing the Dockerfile's NODE_VERSION without updating engines.node
//    (or vice versa).
//
// `.npmrc engine-strict=true` enforces engines on installed *dependencies* only;
// this script is the strict gate for the project's *own* engines field.

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const INVALID_ARG_EXIT_CODE = 2

interface PkgEngines {
  node: string
  npm: string
}
interface Pkg {
  engines?: Partial<PkgEngines>
}

// Range characters per node-semver. An "exact" pin is just `MAJOR.MINOR.PATCH`
// with no operators; anything else would let npm install -g pick whatever the
// latest matching version is at build time, defeating reproducibility.
const RANGE_CHARS = /[\^~*<>=\s\|x]/v

const DOCKERFILE_NODE_ARG = /^ARG\s+NODE_VERSION=(?<version>\S+)\s*$/mv

export interface CheckEnvInput {
  pkg: Pkg
  dockerfile: string | null
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

export function checkEnv(input: CheckEnvInput): CheckEnvResult {
  const enginesResult = validateEngines(input.pkg.engines)
  if (!enginesResult.ok) return { problems: [enginesResult.problem] }
  const runtimeProblems = compareRuntime({ node: input.actualNode, npm: input.actualNpm }, enginesResult.pinned)
  const dockerfileProblems = compareDockerfile(input.dockerfile, enginesResult.pinned.node)
  return { problems: [...runtimeProblems, ...dockerfileProblems] }
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

/* istanbul ignore next -- CLI wrapper around the unit-tested `checkEnv()` function; does real fs/process IO. */
export function main(): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- reading our own package.json; runtime validation isn't worth it.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as Pkg
  const dockerfile = readDockerfileIfPresent()
  const actualNode = process.version.replace(/^v/v, '')
  const actualNpm = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim()
  const { problems } = checkEnv({ pkg, dockerfile, actualNode, actualNpm })
  if (problems.length > 0) {
    console.error('check:env: tooling version mismatch:')
    for (const line of problems) console.error(line)
    console.error('')
    console.error('Update either package.json engines or the Dockerfile so they agree, and')
    console.error('install the matching local toolchain.')
    process.exit(INVALID_ARG_EXIT_CODE)
  }
}

/* istanbul ignore next -- entry-point detection only fires in CLI invocation. */
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
