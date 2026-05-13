'use sanity'

// Codemod: sinon -> vitest mocks.
//
// Usage:
//   tsx tools/sinon-to-vitest-codemod.ts <files...>            (dry run)
//   tsx tools/sinon-to-vitest-codemod.ts --write <files...>    (apply changes)
//
// The shell expands the glob. Pass --skip-import-guard to bypass the testutil
// import check (advanced; only safe once the testutils have been migrated).

import { readFileSync, writeFileSync } from 'node:fs'
import { argv, exit, stderr, stdout } from 'node:process'

const WRITE_FLAG = '--write'
const SKIP_IMPORT_GUARD_FLAG = '--skip-import-guard'

// Specs that import these symbols still receive sinon-typed objects from
// helpers we haven't migrated. The codemod refuses to rewrite them until the
// helper is migrated, otherwise it would break the sinon API access through
// the helper's return value (e.g. responseStub.status.firstCall.args).
const TESTUTIL_SINON_PRODUCERS = ['createResponseFake', 'createLoggerFake', 'createKnexChainFake']

interface Transform {
  pattern: RegExp
  replace: string
  label: string
}

interface FileResult {
  path: string
  before: string
  after: string
  applied: string[]
  todos: string[]
  skipped: boolean
  skipReason: string
}

function importsAnyOf(src: string, names: readonly string[]): readonly string[] {
  return names.filter((n) => new RegExp(`\\b${n}\\b`).test(src))
}

function migrate(path: string, src: string, skipImportGuard: boolean): FileResult {
  const result: FileResult = { path, before: src, after: src, applied: [], todos: [], skipped: false, skipReason: '' }

  if (!skipImportGuard) {
    const couplingImports = importsAnyOf(src, TESTUTIL_SINON_PRODUCERS)
    if (couplingImports.length > 0) {
      result.skipped = true
      result.skipReason = `imports sinon-coupled testutils: ${couplingImports.join(', ')} (migrate those testutils first, or pass --skip-import-guard)`
      return result
    }
  }

  let out = src

  // Order is important: more-specific patterns first.
  const transforms: Transform[] = [
    // 1. Drop sinon imports (default and named).
    {
      pattern: /^import\s+Sinon\s+from\s+['"]sinon['"]\s*\n/gm,
      replace: '',
      label: 'remove: import Sinon from "sinon"',
    },
    {
      pattern: /^import\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"]sinon['"]\s*\n/gm,
      replace: '',
      label: 'remove: named import from "sinon"',
    },

    // 2. Drop the createSandbox declaration.
    {
      pattern: /^(?:const|let|var)\s+sandbox\s*=\s*Sinon\.createSandbox\(\)\s*\n/gm,
      replace: '',
      label: 'remove: Sinon.createSandbox() declaration',
    },

    // 3. Stub/spy factory calls (must run before chain renames so the receiver shape is settled).
    //    `\s*\.\s*` allows for multi-line chains like `sandbox\n  .stub(...)`.
    //    sandbox.stub() / Sinon.stub() / sandbox.spy() / Sinon.spy() with no args -> vi.fn()
    {
      pattern: /\b(?:sandbox|Sinon|sinon)\s*\.\s*(?:stub|spy)\(\s*\)/g,
      replace: 'vi.fn()',
      label: 'X.stub()/X.spy() -> vi.fn()',
    },
    //    sandbox.stub(obj, 'method') -> vi.spyOn(obj, 'method')   (still inside an outer chain)
    {
      pattern: /\b(?:sandbox|Sinon|sinon)\s*\.\s*stub\(/g,
      replace: 'vi.spyOn(',
      label: 'X.stub(obj, "m") -> vi.spyOn(obj, "m")',
    },

    // 4. sandbox.restore() -> vi.restoreAllMocks()
    {
      pattern: /\b(?:sandbox|Sinon|sinon)\s*\.\s*restore\(\s*\)/g,
      replace: 'vi.restoreAllMocks()',
      label: 'X.restore() -> vi.restoreAllMocks()',
    },

    // 5. Chain methods (run *after* the factory rename — we're chaining onto vi.spyOn(...) or vi.fn() now).
    // Specific no-arg forms must come BEFORE the general open-paren forms.
    {
      pattern: /\.resolves\(\s*\)/g,
      replace: '.mockResolvedValue(undefined)',
      label: '.resolves() -> .mockResolvedValue(undefined)',
    },
    {
      pattern: /\.rejects\(\s*\)/g,
      replace: '.mockRejectedValue(undefined)',
      label: '.rejects() -> .mockRejectedValue(undefined)',
    },
    { pattern: /\.returns\(/g, replace: '.mockReturnValue(', label: '.returns -> .mockReturnValue' },
    { pattern: /\.resolves\(/g, replace: '.mockResolvedValue(', label: '.resolves -> .mockResolvedValue' },
    { pattern: /\.rejects\(/g, replace: '.mockRejectedValue(', label: '.rejects -> .mockRejectedValue' },
    { pattern: /\.callsFake\(/g, replace: '.mockImplementation(', label: '.callsFake -> .mockImplementation' },
    {
      pattern: /\.returnsThis\(\s*\)/g,
      replace: '.mockImplementation(function () { return this })',
      label: '.returnsThis() -> .mockImplementation(function () { return this })',
    },
    // .throws(<simple-identifier>) -> .mockImplementation(() => { throw <id> })
    // Only the simple form is auto-rewritten; complex throw arguments are flagged below.
    {
      pattern: /\.throws\(([A-Za-z_$][\w$]*)\)/g,
      replace: '.mockImplementation(() => { throw $1 })',
      label: '.throws(<id>) -> .mockImplementation(() => { throw <id> })',
    },

    // 6. Call-record inspection. These rewrites are global; in test files the API names are sinon-specific.
    //    The file-import guard (above) keeps us out of files that consume sinon-typed objects through testutils.
    {
      pattern: /\.firstCall\.args\[(\d+)\]/g,
      replace: '.mock.calls[0][$1]',
      label: '.firstCall.args[N] -> .mock.calls[0][N]',
    },
    { pattern: /\.firstCall\.args\b/g, replace: '.mock.calls[0]', label: '.firstCall.args -> .mock.calls[0]' },
    {
      pattern: /\.firstCall\.returnValue\b/g,
      replace: '.mock.results[0].value',
      label: '.firstCall.returnValue -> .mock.results[0].value',
    },
    {
      pattern: /\.secondCall\.args\[(\d+)\]/g,
      replace: '.mock.calls[1][$1]',
      label: '.secondCall.args[N] -> .mock.calls[1][N]',
    },
    { pattern: /\.secondCall\.args\b/g, replace: '.mock.calls[1]', label: '.secondCall.args -> .mock.calls[1]' },
    {
      pattern: /\.lastCall\.args\[(\d+)\]/g,
      replace: '.mock.lastCall![$1]',
      label: '.lastCall.args[N] -> .mock.lastCall![N]',
    },
    { pattern: /\.lastCall\.args\b/g, replace: '.mock.lastCall!', label: '.lastCall.args -> .mock.lastCall!' },
    { pattern: /\.callCount\b/g, replace: '.mock.calls.length', label: '.callCount -> .mock.calls.length' },
    { pattern: /\.getCalls\(\s*\)/g, replace: '.mock.calls', label: '.getCalls() -> .mock.calls' },
    { pattern: /\.resetHistory\(\s*\)/g, replace: '.mockClear()', label: '.resetHistory() -> .mockClear()' },
    // .called (boolean) — careful with the negative lookahead so we don't eat .calledWith/.calledOnce/etc.
    {
      pattern: /\.called(?![A-Za-z])/g,
      replace: '.mock.calls.length > 0',
      label: '.called -> .mock.calls.length > 0',
    },

    // 7. Type references.
    { pattern: /\bSinon\.SinonStub\b/g, replace: 'MockInstance', label: 'Sinon.SinonStub -> MockInstance' },
    { pattern: /\bSinon\.SinonSpy\b/g, replace: 'MockInstance', label: 'Sinon.SinonSpy -> MockInstance' },

    // 8. Sinon.match.string -> expect.any(String) (only known use)
    {
      pattern: /\bSinon\.match\.string\b/g,
      replace: 'expect.any(String)',
      label: 'Sinon.match.string -> expect.any(String)',
    },
  ]

  for (const t of transforms) {
    const matches = out.match(t.pattern)
    if (!matches || matches.length === 0) continue
    out = out.replace(t.pattern, t.replace)
    result.applied.push(`${t.label} (${matches.length}x)`)
  }

  // Post-pass: add `: MockInstance` annotation to `let X = vi.fn()` (without existing type
  // annotation) so reassignments to vi.spyOn(...) results don't trip type inference.
  // Must run BEFORE the import-insertion below so the MockInstance token is present.
  out = out.replace(
    /^(\s*let\s+)([A-Za-z_$][\w$]*)(\s*=\s*vi\.fn\(\s*\)[\s;])/gm,
    (_m, lead: string, name: string, tail: string) => {
      result.applied.push(`add: : MockInstance annotation on let ${name}`)
      return `${lead}${name}: MockInstance${tail}`
    },
  )

  // Post-pass: add the MockInstance type import if needed and not already present.
  // Insert after the last existing `import ...` line so it joins the import block
  // rather than floating up next to the 'use sanity' directive.
  if (/\bMockInstance\b/.test(out) && !/from\s+['"]vitest['"]/.test(out)) {
    const lines = out.split('\n')
    let lastImport = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^import\b/.test(lines[i] ?? '')) lastImport = i
    }
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, "import type { MockInstance } from 'vitest'")
      out = lines.join('\n')
      result.applied.push("add: import type { MockInstance } from 'vitest'")
    }
  }

  // Detect unconverted patterns that need hand-review.
  const flagPatterns: Array<{ re: RegExp; reason: string }> = [
    { re: /\.calledWith\(/g, reason: '.calledWith(...) — rewrite as expect(stub).toHaveBeenCalledWith(...)' },
    { re: /\.onCall\(/g, reason: '.onCall(N) — consider .mockReturnValueOnce sequence' },
    { re: /\.resolvesThis\(/g, reason: '.resolvesThis() — no clean vitest equivalent' },
    { re: /\.throws\(/g, reason: '.throws(<complex>) — rewrite as .mockImplementation(() => { throw <expr> })' },
    { re: /\bSinon\.SinonSandbox\b/g, reason: 'Sinon.SinonSandbox type — sandbox concept removed' },
    { re: /\bSinon\.SinonFakeTimers\b/g, reason: 'Sinon.SinonFakeTimers type — needs fake-timer restructuring' },
    { re: /\bSinon\.SinonSpyCall\b/g, reason: 'Sinon.SinonSpyCall type — hand-review' },
    { re: /\buseFakeTimers\b/g, reason: 'useFakeTimers — vi.useFakeTimers() + vi.setSystemTime() restructure' },
    { re: /\bsandbox\.\w+/g, reason: 'leftover sandbox.* reference' },
    { re: /\bSinon\.\w+/g, reason: 'leftover Sinon.* reference' },
    { re: /\bsinon\.\w+/g, reason: 'leftover sinon.* reference' },
  ]
  for (const flag of flagPatterns) {
    const matches = out.match(flag.re)
    if (matches) result.todos.push(`${flag.reason} (${matches.length}x)`)
  }

  result.after = out
  return result
}

function main(): void {
  const args = argv.slice(2)
  const write = args.includes(WRITE_FLAG)
  const skipImportGuard = args.includes(SKIP_IMPORT_GUARD_FLAG)
  const files = args.filter((a) => !a.startsWith('--'))

  if (files.length === 0) {
    stderr.write('usage: tsx tools/sinon-to-vitest-codemod.ts [--write] [--skip-import-guard] <files...>\n')
    exit(1)
  }

  let totalChanged = 0
  let totalSkipped = 0
  let totalTodos = 0
  let totalNoop = 0

  for (const path of files) {
    const src = readFileSync(path, 'utf8')
    const r = migrate(path, src, skipImportGuard)

    if (r.skipped) {
      totalSkipped++
      stdout.write(`SKIP   ${path}\n  reason: ${r.skipReason}\n`)
      continue
    }
    if (r.before === r.after && r.todos.length === 0) {
      totalNoop++
      continue
    }

    totalChanged++
    totalTodos += r.todos.length
    stdout.write(`\n=== ${path} ===\n`)
    for (const a of r.applied) stdout.write(`  ✓ ${a}\n`)
    for (const t of r.todos) stdout.write(`  ⚠ TODO: ${t}\n`)

    if (write) {
      writeFileSync(path, r.after, 'utf8')
      stdout.write(`  → written\n`)
    }
  }

  stdout.write(
    `\nsummary: ${totalChanged} changed, ${totalSkipped} skipped, ${totalNoop} no-op, ${totalTodos} TODOs flagged\n`,
  )
  if (!write && totalChanged > 0) {
    stdout.write('(dry run — pass --write to apply)\n')
  }
}

main()
