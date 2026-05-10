'use sanity'

// Migration tool: rewrites chai `expect(x).to.X(...)` chains to vitest's
// `expect(x).toX(...)` equivalents and strips the chai import. Used once
// per directory during the chai → vitest migration, then deleted in the
// final PR. Not production code; excluded from coverage and lint.
//
// Usage:
//   npx tsx tools/chai-to-vitest.ts [--dry-run] <glob> [<glob> ...]
//
// Patterns that don't have a clean 1:1 vitest equivalent (`.to.have.any.keys`,
// `.to.have.members`, `.to.be.a('string')`, `.and.satisfy`, `.deep.include`,
// terminal `.length` without call, etc.) are emitted as BAILS with file:line
// for hand-rewriting.

import { Project, Node, type SourceFile } from 'ts-morph'
import { argv, exit } from 'node:process'

interface ChainToken {
  name: string
  isCall: boolean
  args: readonly Node[]
}

type AnalyzeResult =
  | { kind: 'rewrite'; method: string; args: readonly Node[]; hasNot: boolean }
  | { kind: 'bail'; reason: string }

interface Bail {
  line: number
  reason: string
  chain: string
}

const PURE_MODIFIERS = new Set(['to', 'be', 'have', 'that', 'and'])
const TERMINAL_METHOD_MAP: Readonly<Record<string, string>> = {
  equal: 'toBe',
  lengthOf: 'toHaveLength',
  length: 'toHaveLength',
  include: 'toContain',
  contain: 'toContain',
  instanceOf: 'toBeInstanceOf',
  property: 'toHaveProperty',
  match: 'toMatch',
  above: 'toBeGreaterThan',
  greaterThan: 'toBeGreaterThan',
  greaterThanOrEqual: 'toBeGreaterThanOrEqual',
  throw: 'toThrow',
}
const BAIL_TERMINALS = new Set(['keys', 'members', 'satisfy', 'a', 'an'])

function findOutermost(start: Node): Node {
  let outermost = start
  while (true) {
    const parent = outermost.getParent()
    if (!parent) return outermost
    if (Node.isPropertyAccessExpression(parent) && parent.getExpression() === outermost) {
      outermost = parent
      continue
    }
    if (Node.isCallExpression(parent) && parent.getExpression() === outermost) {
      outermost = parent
      continue
    }
    return outermost
  }
}

function collectTokens(expectCall: Node, outermost: Node): ChainToken[] {
  const tokens: ChainToken[] = []
  let cur: Node = expectCall
  while (cur !== outermost) {
    const parent = cur.getParent()
    if (!parent || !Node.isPropertyAccessExpression(parent)) break
    const grandparent = parent.getParent()
    if (grandparent && Node.isCallExpression(grandparent) && grandparent.getExpression() === parent) {
      tokens.push({ name: parent.getName(), isCall: true, args: grandparent.getArguments() })
      cur = grandparent
    } else {
      tokens.push({ name: parent.getName(), isCall: false, args: [] })
      cur = parent
    }
  }
  return tokens
}

function analyze(tokens: readonly ChainToken[]): AnalyzeResult {
  let hasNot = false
  let hasDeep = false
  let hasNested = false
  let hasAnyAll = false

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (!t) continue

    if (!t.isCall && PURE_MODIFIERS.has(t.name)) continue
    if (!t.isCall && t.name === 'not') {
      hasNot = true
      continue
    }
    if (!t.isCall && t.name === 'deep') {
      hasDeep = true
      continue
    }
    if (!t.isCall && t.name === 'nested') {
      hasNested = true
      continue
    }
    if (!t.isCall && (t.name === 'an' || t.name === 'a')) continue
    if (!t.isCall && (t.name === 'any' || t.name === 'all')) {
      hasAnyAll = true
      continue
    }

    const isLast = i === tokens.length - 1
    if (!isLast) {
      const tail = tokens
        .slice(i)
        .map((x) => `.${x.name}${x.isCall ? '(...)' : ''}`)
        .join('')
      return { kind: 'bail', reason: `tokens after expected terminal: ${tail}` }
    }
    if (!t.isCall) {
      return { kind: 'bail', reason: `terminal property access .${t.name} (no call) — manual rewrite` }
    }
    if (BAIL_TERMINALS.has(t.name)) {
      return { kind: 'bail', reason: `.${t.name}(...) requires manual review` }
    }
    if ((t.name === 'include' || t.name === 'contain') && hasDeep) {
      return { kind: 'bail', reason: `.deep.${t.name}(...) requires manual review` }
    }
    if (t.name === 'keys' && hasAnyAll) {
      return { kind: 'bail', reason: '.any/all.keys(...) requires manual review' }
    }
    if (t.name === 'property' && !hasNested) {
      return { kind: 'bail', reason: '.to.have.property(...) without .nested — verify dot-path semantics' }
    }

    const baseMethod = TERMINAL_METHOD_MAP[t.name]
    if (baseMethod === undefined) {
      return { kind: 'bail', reason: `unknown terminal .${t.name}(...)` }
    }
    const method = t.name === 'equal' && hasDeep ? 'toEqual' : baseMethod
    return { kind: 'rewrite', method, args: t.args, hasNot }
  }
  return { kind: 'bail', reason: 'no terminal token found' }
}

interface RewriteSummary {
  rewrites: number
  bails: Bail[]
}

function rewriteFile(sourceFile: SourceFile): RewriteSummary {
  const bails: Bail[] = []
  let rewrites = 0

  interface Target {
    outermost: Node
    expectCall: Node
  }
  const targets: Target[] = []
  sourceFile.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return
    const callee = node.getExpression()
    if (!Node.isIdentifier(callee) || callee.getText() !== 'expect') return
    const outermost = findOutermost(node)
    if (outermost === node) return
    targets.push({ outermost, expectCall: node })
  })

  for (const { outermost, expectCall } of targets) {
    if (outermost.wasForgotten() || expectCall.wasForgotten()) continue
    const tokens = collectTokens(expectCall, outermost)
    const result = analyze(tokens)
    if (result.kind === 'bail') {
      bails.push({
        line: outermost.getStartLineNumber(),
        reason: result.reason,
        chain: outermost.getText().split('\n')[0]?.slice(0, 120) ?? '',
      })
      continue
    }
    const expectCallText = expectCall.getText()
    const argsText = result.args.map((a) => a.getText()).join(', ')
    const notPrefix = result.hasNot ? '.not' : ''
    outermost.replaceWithText(`${expectCallText}${notPrefix}.${result.method}(${argsText})`)
    rewrites++
  }

  const chaiImport = sourceFile.getImportDeclaration((d) => d.getModuleSpecifierValue() === 'chai')
  if (chaiImport) {
    const named = chaiImport.getNamedImports()
    const expectNode = named.find((n) => n.getName() === 'expect')
    if (expectNode) {
      if (named.length === 1) {
        chaiImport.remove()
      } else {
        expectNode.remove()
      }
    }
  }

  // Preserve the codebase convention of a blank line after the `'use sanity'`
  // directive. ts-morph's import removal absorbs the blank line that originally
  // separated the directive from the first import, so put it back when needed.
  const fullText = sourceFile.getFullText()
  const fixedText = fullText.replace(/^('use sanity')\nimport /u, '$1\n\nimport ')
  if (fixedText !== fullText) {
    sourceFile.replaceWithText(fixedText)
  }

  return { rewrites, bails }
}

async function main(): Promise<void> {
  const rawArgs = argv.slice(2)
  const dryRun = rawArgs.includes('--dry-run')
  const fileArgs = rawArgs.filter((a) => !a.startsWith('--'))

  if (fileArgs.length === 0) {
    console.error('Usage: npx tsx tools/chai-to-vitest.ts [--dry-run] <glob> [<glob> ...]')
    exit(1)
  }

  const project = new Project({ tsConfigFilePath: './tsconfig.json', skipAddingFilesFromTsConfig: true })
  const sourceFiles = fileArgs.flatMap((p) => project.addSourceFilesAtPaths(p))

  if (sourceFiles.length === 0) {
    console.error('No files matched the supplied globs.')
    exit(1)
  }

  let totalRewrites = 0
  let totalBails = 0
  const filesTouched: string[] = []

  for (const sf of sourceFiles) {
    const filePath = sf.getFilePath()
    const { rewrites, bails } = rewriteFile(sf)
    if (rewrites === 0 && bails.length === 0) {
      console.log(`SKIP ${filePath} (no chai assertions found)`)
      continue
    }
    if (bails.length > 0) {
      console.log(`BAILS in ${filePath}:`)
      for (const b of bails) {
        console.log(`  L${b.line}: ${b.reason}`)
        console.log(`    ${b.chain}`)
      }
    }
    if (rewrites > 0) {
      console.log(`REWROTE ${rewrites} chain(s) in ${filePath}`)
      filesTouched.push(filePath)
    }
    totalRewrites += rewrites
    totalBails += bails.length
  }

  if (dryRun) {
    console.log(
      `\nDRY RUN: would rewrite ${totalRewrites} chain(s) across ${filesTouched.length} file(s), with ${totalBails} bail(s).`,
    )
  } else {
    await project.save()
    console.log(`\nSaved ${filesTouched.length} file(s). ${totalRewrites} rewrite(s), ${totalBails} bail(s).`)
  }
}

await main()
