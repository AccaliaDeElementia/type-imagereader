// Asserts that the Node and npm versions running this process match the exact
// versions pinned in `package.json` engines, and that the Dockerfile's
// NODE_VERSION ARG default matches engines.node. Catches:
//  - the dev container drifting ahead of the production container (cryptic
//    `npm ci` lockfile errors at deploy time);
//  - someone editing the Dockerfile's NODE_VERSION without updating engines.node
//    (or vice versa).
//
// `.npmrc engine-strict=true` covers the install-time check; this script covers
// the test-time check (an existing node_modules in a container that was started
// under a different Node/npm, and static drift between Dockerfile + package.json).
//
// npm pin: the Dockerfile reads `engines.npm` at build time via `node -p`, so
// there is nothing to validate statically for npm — drift is impossible.

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const requiredNode = pkg.engines?.node
const requiredNpm = pkg.engines?.npm

if (typeof requiredNode !== 'string' || typeof requiredNpm !== 'string') {
  console.error('check:env: package.json engines.node and engines.npm must both be set')
  process.exit(1)
}

// Engines pins must be exact versions; ranges (^, ~, *, x, >, <, ||, spaces)
// would let `npm install -g npm@<range>` resolve to whatever is latest at
// build time, defeating the reproducibility guarantee.
const RANGE_CHARS = /[\^~*<>= |x]/
if (RANGE_CHARS.test(requiredNode) || RANGE_CHARS.test(requiredNpm)) {
  console.error('check:env: engines.node and engines.npm must be exact versions, not ranges')
  process.exit(1)
}

const actualNode = process.version.replace(/^v/, '')
const actualNpm = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim()

const problems = []
if (actualNode !== requiredNode) {
  problems.push(`  node: required ${requiredNode}, running ${actualNode}`)
}
if (actualNpm !== requiredNpm) {
  problems.push(`  npm:  required ${requiredNpm}, running ${actualNpm}`)
}

// Dockerfile ARG NODE_VERSION default must match engines.node so docker builds
// can't silently pull a floating node tag.
const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8')
const nodeArgMatch = dockerfile.match(/^ARG\s+NODE_VERSION=(\S+)\s*$/m)
if (nodeArgMatch === null) {
  problems.push('  Dockerfile: ARG NODE_VERSION line not found')
} else if (nodeArgMatch[1] !== requiredNode) {
  problems.push(`  Dockerfile NODE_VERSION: required ${requiredNode}, declared ${nodeArgMatch[1]}`)
}

if (problems.length > 0) {
  console.error('check:env: tooling version mismatch:')
  for (const line of problems) console.error(line)
  console.error('')
  console.error('Update either package.json engines or the Dockerfile so they agree, and')
  console.error('install the matching local toolchain.')
  process.exit(1)
}
