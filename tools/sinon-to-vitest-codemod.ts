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
// the helper's return value (e.g. responseStub.status.firstCall.args) or the
// helper's argument expectations (e.g. findStubCall expects a SinonStub and
// internally calls .getCalls() — which vitest mocks don't have).
const TESTUTIL_SINON_PRODUCERS: readonly string[] = []

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

    // 2. Drop the createSandbox declaration (handles indented declarations too — e.g. inside a nested describe).
    {
      pattern: /^[ \t]*(?:const|let|var)\s+sandbox\s*=\s*Sinon\.createSandbox\(\)\s*\n/gm,
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
    //    sandbox.stub(obj, 'method') / sandbox.spy(obj, 'method') -> vi.spyOn(obj, 'method')
    //    (still inside an outer chain). Both sinon forms map to vi.spyOn — the difference
    //    in sinon is "always-replace" (stub) vs "call-through" (spy). The bare-spyOn
    //    post-pass below appends `.mockImplementation(cast(() => undefined))` to anything
    //    not chained, which preserves stub's "no-op default" semantic. For sandbox.spy
    //    use cases that *want* call-through, hand-revert by deleting the post-pass insertion.
    {
      pattern: /\b(?:sandbox|Sinon|sinon)\s*\.\s*(?:stub|spy)\(/g,
      replace: 'vi.spyOn(',
      label: 'X.stub(obj, "m") / X.spy(obj, "m") -> vi.spyOn(obj, "m")',
    },

    // 4. sandbox.restore() -> vi.restoreAllMocks()
    {
      pattern: /\b(?:sandbox|Sinon|sinon)\s*\.\s*restore\(\s*\)/g,
      replace: 'vi.restoreAllMocks()',
      label: 'X.restore() -> vi.restoreAllMocks()',
    },

    // 5. Chain methods (run *after* the factory rename — we're chaining onto vi.spyOn(...) or vi.fn() now).
    //
    // .onFirstCall().X(v) / .onSecondCall().X(v) / .onThirdCall().X(v) / .onCall(N).X(v)
    // -> .mockReturnValueOnce(v) / .mockResolvedValueOnce(v) / .mockRejectedValueOnce(v)
    // CAVEAT: assumes sequential call setup (call 0 then 1 then 2…). If a spec configures
    // call N without configuring 0..N-1, vitest queues N's value for the next unconsumed
    // call (which may be earlier than N). MUST run BEFORE the generic `.returns(` rewrite
    // otherwise the bare `.returns(` gets converted first, leaving `.onFirstCall().mockReturnValue(...)`.
    {
      pattern: /\.on(?:First|Second|Third|Fourth)Call\(\)\.returns\(/g,
      replace: '.mockReturnValueOnce(',
      label: '.onNthCall().returns(v) -> .mockReturnValueOnce(v)',
    },
    // `.onNthCall().callsFake(fn)` → `.mockImplementationOnce(fn)`. Must run BEFORE the
    // general `.callsFake(` rewrite, otherwise we'd be left with `.onNthCall().mockImplementation(`
    // which is invalid (sinon's onCall accessor doesn't exist on vitest mocks).
    {
      pattern: /\.on(?:First|Second|Third|Fourth)Call\(\)\s*\.\s*callsFake\(/g,
      replace: '.mockImplementationOnce(',
      label: '.onNthCall().callsFake(fn) -> .mockImplementationOnce(fn)',
    },
    {
      pattern: /\.onCall\(\d+\)\s*\.\s*callsFake\(/g,
      replace: '.mockImplementationOnce(',
      label: '.onCall(N).callsFake(fn) -> .mockImplementationOnce(fn)',
    },
    // No-arg forms first — sinon's bare .resolves()/.rejects() resolved/rejected to undefined.
    {
      pattern: /\.on(?:First|Second|Third|Fourth)Call\(\)\.resolves\(\s*\)/g,
      replace: '.mockResolvedValueOnce(undefined)',
      label: '.onNthCall().resolves() -> .mockResolvedValueOnce(undefined)',
    },
    {
      pattern: /\.on(?:First|Second|Third|Fourth)Call\(\)\.rejects\(\s*\)/g,
      replace: '.mockRejectedValueOnce(undefined)',
      label: '.onNthCall().rejects() -> .mockRejectedValueOnce(undefined)',
    },
    {
      pattern: /\.on(?:First|Second|Third|Fourth)Call\(\)\.resolves\(/g,
      replace: '.mockResolvedValueOnce(',
      label: '.onNthCall().resolves(v) -> .mockResolvedValueOnce(v)',
    },
    {
      pattern: /\.on(?:First|Second|Third|Fourth)Call\(\)\.rejects\(/g,
      replace: '.mockRejectedValueOnce(',
      label: '.onNthCall().rejects(v) -> .mockRejectedValueOnce(v)',
    },
    {
      pattern: /\.onCall\(\d+\)\.returns\(/g,
      replace: '.mockReturnValueOnce(',
      label: '.onCall(N).returns(v) -> .mockReturnValueOnce(v)',
    },
    {
      pattern: /\.onCall\(\d+\)\.resolves\(/g,
      replace: '.mockResolvedValueOnce(',
      label: '.onCall(N).resolves(v) -> .mockResolvedValueOnce(v)',
    },
    {
      pattern: /\.onCall\(\d+\)\.rejects\(/g,
      replace: '.mockRejectedValueOnce(',
      label: '.onCall(N).rejects(v) -> .mockRejectedValueOnce(v)',
    },
    // .getCall(<expr>).args[M] -> .mock.calls[<expr>]?.[M]
    // .getCall(<expr>).args -> .mock.calls[<expr>]
    // Matches identifier or numeric-literal index (not arbitrary expressions to keep regex tractable).
    {
      pattern: /\.getCall\((\w+)\)\.args\[(\d+)\]/g,
      replace: '.mock.calls[$1]?.[$2]',
      label: '.getCall(N).args[M] -> .mock.calls[N]?.[M]',
    },
    {
      pattern: /\.getCall\((\w+)\)\.args\b/g,
      replace: '.mock.calls[$1]',
      label: '.getCall(N).args -> .mock.calls[N]',
    },
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
    // Explicit `this: object` annotation keeps `noImplicitThis`/`no-unsafe-return` happy.
    // Sinon's returnsThis() is overwhelmingly used on chainable-builder fakes whose `this`
    // is the host object — `object` is a broad-enough constraint to satisfy strict rules.
    {
      pattern: /\.returnsThis\(\s*\)/g,
      replace: '.mockImplementation(function (this: object): unknown { return this })',
      label: '.returnsThis() -> .mockImplementation(function (this: object): unknown { return this })',
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
    // Note: emit `[N]?.[M]` (optional index chain) because tsconfig has
    // `noUncheckedIndexedAccess: true`. The optional chain keeps the output type-safe
    // when the call we're indexing into hasn't happened yet.
    {
      pattern: /\.firstCall\.args\[(\d+)\]/g,
      replace: '.mock.calls[0]?.[$1]',
      label: '.firstCall.args[N] -> .mock.calls[0]?.[N]',
    },
    { pattern: /\.firstCall\.args\b/g, replace: '.mock.calls[0]', label: '.firstCall.args -> .mock.calls[0]' },
    {
      pattern: /\.firstCall\.returnValue\b/g,
      replace: '.mock.results[0]?.value',
      label: '.firstCall.returnValue -> .mock.results[0]?.value',
    },
    {
      pattern: /\.secondCall\.args\[(\d+)\]/g,
      replace: '.mock.calls[1]?.[$1]',
      label: '.secondCall.args[N] -> .mock.calls[1]?.[N]',
    },
    { pattern: /\.secondCall\.args\b/g, replace: '.mock.calls[1]', label: '.secondCall.args -> .mock.calls[1]' },
    {
      pattern: /\.thirdCall\.args\[(\d+)\]/g,
      replace: '.mock.calls[2]?.[$1]',
      label: '.thirdCall.args[N] -> .mock.calls[2]?.[N]',
    },
    { pattern: /\.thirdCall\.args\b/g, replace: '.mock.calls[2]', label: '.thirdCall.args -> .mock.calls[2]' },
    {
      pattern: /\.lastCall\.args\[(\d+)\]/g,
      replace: '.mock.lastCall?.[$1]',
      label: '.lastCall.args[N] -> .mock.lastCall?.[N]',
    },
    { pattern: /\.lastCall\.args\b/g, replace: '.mock.lastCall', label: '.lastCall.args -> .mock.lastCall' },
    { pattern: /\.callCount\b/g, replace: '.mock.calls.length', label: '.callCount -> .mock.calls.length' },
    { pattern: /\.getCalls\(\s*\)/g, replace: '.mock.calls', label: '.getCalls() -> .mock.calls' },
    { pattern: /\.resetHistory\(\s*\)/g, replace: '.mockClear()', label: '.resetHistory() -> .mockClear()' },
    // Per-stub restore (sinon's instance method) -> vitest's per-mock restore.
    // Distinct from sandbox.restore() which is handled above (-> vi.restoreAllMocks()).
    // Match `<id>?.restore()` and `<id>.restore()` but NOT `sandbox.restore()` / `Sinon.restore()` / `sinon.restore()`.
    {
      pattern: /(?<!\b(?:sandbox|Sinon|sinon))\.restore\(\s*\)/g,
      replace: '.mockRestore()',
      label: '<stub>.restore() -> <stub>.mockRestore()',
    },
    // .called (boolean) — careful with the negative lookahead so we don't eat .calledWith/.calledOnce/etc.
    {
      pattern: /\.called(?![A-Za-z])/g,
      replace: '.mock.calls.length > 0',
      label: '.called -> .mock.calls.length > 0',
    },

    // 7. Type references. Match both uppercase (`Sinon.`) and lowercase (`sinon.`) namespace forms.
    { pattern: /\b[Ss]inon\.SinonStub\b/g, replace: 'MockInstance', label: 'Sinon.SinonStub -> MockInstance' },
    { pattern: /\b[Ss]inon\.SinonSpy\b/g, replace: 'MockInstance', label: 'Sinon.SinonSpy -> MockInstance' },

    // 7b. Fake-timer plumbing. The teardown side (vi.useRealTimers in afterEach) is
    // flagged below as a CODEMOD-TODO since structure-changing rewrites are out of scope.
    // Drop `let ClockFake: Sinon.SinonFakeTimers | undefined = undefined` style declarations
    // entirely — the variable is no longer needed (vi.useFakeTimers() returns void).
    {
      pattern: /^\s*let\s+\w+:\s*[Ss]inon\.SinonFakeTimers\s*\|\s*undefined\s*=\s*undefined\s*\n/gm,
      replace: '',
      label: 'remove: let <name>: Sinon.SinonFakeTimers | undefined = undefined',
    },
    // `<id> = sandbox.useFakeTimers()` -> `vi.useFakeTimers()` (LHS dropped).
    {
      pattern: /\b\w+\s*=\s*(?:sandbox|Sinon|sinon)\s*\.\s*useFakeTimers\(\s*\)/g,
      replace: 'vi.useFakeTimers()',
      label: '<id> = X.useFakeTimers() -> vi.useFakeTimers() (LHS dropped)',
    },
    // Bare `sandbox.useFakeTimers()` (no LHS).
    {
      pattern: /\b(?:sandbox|Sinon|sinon)\s*\.\s*useFakeTimers\(\s*\)/g,
      replace: 'vi.useFakeTimers()',
      label: 'X.useFakeTimers() -> vi.useFakeTimers()',
    },
    // `<id>?.tick(N)` / `<id>.tick(N)` -> `vi.advanceTimersByTime(N)`.
    {
      pattern: /\b\w+\?\.tick\(/g,
      replace: 'vi.advanceTimersByTime(',
      label: '<id>?.tick(N) -> vi.advanceTimersByTime(N)',
    },
    {
      pattern: /\b\w+\.tick\(/g,
      replace: 'vi.advanceTimersByTime(',
      label: '<id>.tick(N) -> vi.advanceTimersByTime(N)',
    },

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

  // Post-pass: bare `vi.spyOn(obj, 'method')` (no chained mock) calls through to
  // the original by default. sinon's `sandbox.stub(obj, 'method')` replaced with a
  // no-op. Append `.mockImplementation((..._args: unknown[]) => undefined)` to any
  // spyOn call not already followed by a `.mock*` chain — the explicit signature
  // (variadic unknown args, undefined return) is structurally assignable to most
  // function types AND passes strict `no-unsafe-argument` lint that `cast(() => undefined)`
  // sometimes tripped on Debugger-typed properties (any-parameter signatures).
  // When a subsequent chain like `.mockReturnValue(v)` exists, it overrides the default impl.
  out = out.replace(/(vi\.spyOn\([^)]+\))(?!\.\w)/g, '$1.mockImplementation((..._args: unknown[]) => undefined)')

  // Post-pass: optional-chain `.called` -> `.mock.calls.length > 0` produces a
  // `number | undefined > 0` type that tsconfig's strict mode rejects. Wrap with
  // `?? 0` to keep the comparison type-safe. Only fires on `<id>?.mock.calls.length > 0`
  // patterns produced earlier in the transform list.
  out = out.replace(/\b(\w+)\?\.mock\.calls\.length > 0/g, '($1?.mock.calls.length ?? 0) > 0')

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
  // Insert after the last existing `import ...` statement so it joins the import block
  // rather than floating up next to the 'use sanity' directive. The matcher targets the
  // END of an import (the line containing `from '...'`) so multi-line imports like
  //   import {
  //     a, b, c,
  //   } from '...'
  // don't get split by the inserted line.
  if (/\bMockInstance\b/.test(out) && !/from\s+['"]vitest['"]/.test(out)) {
    const lines = out.split('\n')
    let lastImportEnd = -1
    for (let i = 0; i < lines.length; i++) {
      if (/from\s+['"][^'"]+['"]\s*;?\s*$/.test(lines[i] ?? '')) lastImportEnd = i
    }
    if (lastImportEnd >= 0) {
      lines.splice(lastImportEnd + 1, 0, "import type { MockInstance } from 'vitest'")
      out = lines.join('\n')
      result.applied.push("add: import type { MockInstance } from 'vitest'")
    }
  }

  // Detect unconverted patterns that need hand-review.
  const flagPatterns: Array<{ re: RegExp; reason: string }> = [
    { re: /\.calledWith\(/g, reason: '.calledWith(...) — rewrite as expect(stub).toHaveBeenCalledWith(...)' },
    {
      re: /\.calledWithExactly\(/g,
      reason:
        '.calledWithExactly(...) — rewrite as expect(stub).toHaveBeenCalledWith(...) (vitest already matches exactly)',
    },
    {
      re: /\.calledOnceWith(?:Exactly)?\(/g,
      reason:
        '.calledOnceWith(...) / .calledOnceWithExactly(...) — rewrite as expect(stub).toHaveBeenCalledExactlyOnceWith(...) (vitest 1.x+)',
    },
    {
      re: /vi\.spyOn\([^)]+\)\.value\(/g,
      reason:
        ".value(<obj>) — sinon-only; vi.spyOn can't replace non-function properties. Spy on the inner method instead, or directly assign + restore in afterEach",
    },
    { re: /\.onCall\(/g, reason: '.onCall(N) — consider .mockReturnValueOnce sequence' },
    {
      re: /\.on(?:First|Second|Third|Fourth)Call\(/g,
      reason:
        '.on(First|Second|...)Call() — rewrite as chained .mockReturnValueOnce/.mockResolvedValueOnce/.mockRejectedValueOnce',
    },
    {
      re: /\.calledAfter\(/g,
      reason: '.calledAfter(X) — rewrite via mock.invocationCallOrder comparison',
    },
    {
      re: /\.calledBefore\(/g,
      reason: '.calledBefore(X) — rewrite via mock.invocationCallOrder comparison',
    },
    {
      re: /\.tickAsync\(/g,
      reason: '.tickAsync(N) — rewrite as `await vi.advanceTimersByTimeAsync(N)`',
    },
    { re: /\.resolvesThis\(/g, reason: '.resolvesThis() — no clean vitest equivalent' },
    { re: /\.throws\(/g, reason: '.throws(<complex>) — rewrite as .mockImplementation(() => { throw <expr> })' },
    { re: /\bSinon\.SinonSandbox\b/g, reason: 'Sinon.SinonSandbox type — sandbox concept removed' },
    { re: /\bSinon\.SinonFakeTimers\b/g, reason: 'Sinon.SinonFakeTimers type — needs fake-timer restructuring' },
    { re: /\bSinon\.SinonSpyCall\b/g, reason: 'Sinon.SinonSpyCall type — hand-review' },
    {
      re: /\.useFakeTimers\(\s*\{/g,
      reason: 'useFakeTimers({...}) with options — hand-rewrite as vi.useFakeTimers(); vi.setSystemTime(...)',
    },
    {
      re: /\.useFakeTimers\(\s*\d/g,
      reason:
        'useFakeTimers(<number>) with numeric arg — hand-rewrite as vi.useFakeTimers(); vi.setSystemTime(<number>)',
    },
    {
      re: /vi\.useFakeTimers\(\)/g,
      reason:
        'vi.useFakeTimers() detected — ensure afterEach also calls vi.useRealTimers() (vi.restoreAllMocks() does NOT restore timers)',
    },
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
