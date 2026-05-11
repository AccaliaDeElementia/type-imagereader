import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import love from 'eslint-config-love'
import eslintConfigPrettier from 'eslint-config-prettier'

const describeLikeNames = new Set(['describe', 'context'])
const isDescribeCallback = (fn) => {
  const parent = fn.parent
  if (!parent || parent.type !== 'CallExpression') return false
  const callee = parent.callee
  if (callee.type === 'Identifier') return describeLikeNames.has(callee.name)
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    describeLikeNames.has(callee.object.name)
  ) {
    return true
  }
  return false
}

const noMethodStubOutsideHook = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      leak: 'Method-replacing stub() must be inside a test hook or helper function (beforeEach/it/before/after or any function called from a test). At describe or module scope the stub runs once at describe registration, and sandbox.restore() unrestores the method after the first test — later tests then run against the unpatched method.',
    },
  },
  create(context) {
    // Stack of booleans: true = current lexical position executes at describe-body
    // evaluation time (module scope, or directly inside a describe/context callback).
    // false = inside some other function (hook, test body, helper, iteration callback)
    // which only runs when invoked, so sandbox.restore() cleans up between tests.
    const executesAtDescribeTime = [true]
    return {
      ':function'(node) {
        executesAtDescribeTime.push(isDescribeCallback(node))
      },
      ':function:exit'() {
        executesAtDescribeTime.pop()
      },
      CallExpression(node) {
        if (!executesAtDescribeTime[executesAtDescribeTime.length - 1]) return
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'stub' &&
          node.arguments.length >= 2 &&
          node.arguments[1].type === 'Literal' &&
          typeof node.arguments[1].value === 'string'
        ) {
          context.report({ node, messageId: 'leak' })
        }
      },
    }
  },
}

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.ts'],
  },
  {
    ...love,
    files: ['**/*.ts'],
  },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ...eslintConfigPrettier,
  },
  {
    rules: {
      // Naming convention enforcement. See CLAUDE.md for the full convention.
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'class', format: ['PascalCase'] },
        { selector: 'interface', format: ['PascalCase'] },
        { selector: 'typeAlias', format: ['PascalCase'] },
        { selector: 'enum', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['PascalCase', 'UPPER_CASE'] },
        { selector: 'typeParameter', format: ['PascalCase'] },
        { selector: 'function', format: ['camelCase'] },
        { selector: 'method', format: ['camelCase'] },
        // Class properties: camelCase, with `_foo` allowed as the codebase's informal-private convention.
        { selector: 'classProperty', format: ['camelCase'], leadingUnderscore: 'allow' },
        // Variables: camelCase locals, UPPER_CASE module constants, PascalCase
        // namespace-style containers (Imports / Internals / Config / etc.)
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'], leadingUnderscore: 'allow' },
      ],
      'require-atomic-updates': 'error',
      'require-unicode-regexp': 'error',
      // Destructure same-name extractions in declarations (`const { foo } = obj`
      // over `const foo = obj.foo`), but leave two cases alone:
      //  - Assignment-form (`obj.x = src.x`) requires a leading `;({ x: obj.x } = src)`
      //    to defeat ASI, which reads worse than the direct assignment for negligible gain.
      //  - Renamed extractions (`const userId = user.id` → `const { id: userId } = user`)
      //    flip the read order from local-then-property to property-then-local, which
      //    is consistently harder to skim. The local name often carries domain meaning
      //    the property name doesn't.
      // Both exemptions are deliberate — eslint-config-love's defaults flag both, and
      // we override here. Surveyed in May 2026 against ~150 surfaced sites; refactoring
      // them into compliant forms costs more readability than the rule recovers.
      '@typescript-eslint/prefer-destructuring': [
        'error',
        {
          VariableDeclarator: { array: true, object: true },
          AssignmentExpression: { array: false, object: false },
        },
        { enforceForRenamedProperties: false, enforceForDeclarationWithTypeAnnotation: false },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportNamespaceSpecifier',
          message:
            "Don't use `import * as X` namespace imports. Use named imports (`import { foo } from …`) so the dependency graph stays explicit and tree-shakable. See CLAUDE.md.",
        },
        {
          selector: 'ExportAllDeclaration',
          message:
            "Don't use `export * from` re-exports. List the names explicitly so consumers see the public surface at the export site. See CLAUDE.md.",
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**'],
              importNames: ['Internals', 'Imports'],
              message:
                "`Internals` and `Imports` are stub seams scoped to their defining module. Production code should import the named function directly; if you need a stub seam in this file, add it to this file's own `Imports` object.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ['test/**/*.js', 'test/**/*.ts'],
    plugins: {
      local: {
        rules: {
          'no-method-stub-outside-hook': noMethodStubOutsideHook,
        },
      },
    },
    rules: {
      '@typescript-eslint/strict-void-return': 'off', // Chai assertions and Sinon spies idiomatically return values in void contexts
      // Typescript tests typically use magic numbers as they are often more readable than hundreds or thousands of constants created
      // for the many test cases that tests use
      '@typescript-eslint/no-magic-numbers': 'off',
      // Mocha-style tests consume callback levels for describe/forEach/it before any
      // user logic runs. The project default of 3 leaves zero room for an async test
      // body inside a parameterized forEach. Bump to 5 for spec files only.
      'max-nested-callbacks': ['error', 5],
      // Spec files legitimately import Internals (within-module stub seam) and Imports
      // (cross-module stub seam) of the module under test.
      'no-restricted-imports': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Sinon'][callee.property.name='stub']",
          message:
            'Do not use Sinon.stub() — it registers into the default sandbox and leaks across the full test run. Use sandbox.stub() via a per-describe sandbox (const sandbox = Sinon.createSandbox(), plus sandbox.restore() in afterEach).',
        },
        {
          selector: 'ImportNamespaceSpecifier',
          message:
            "Don't use `import * as X` namespace imports. Use named imports (`import { foo } from …`) so the dependency graph stays explicit and tree-shakable. See CLAUDE.md.",
        },
        {
          selector: 'ExportAllDeclaration',
          message:
            "Don't use `export * from` re-exports. List the names explicitly so consumers see the public surface at the export site. See CLAUDE.md.",
        },
      ],
      'local/no-method-stub-outside-hook': 'error',
    },
  },
  {
    ignores: ['coverage/**', 'coverage-vitest/**', 'eslint.config.mjs', 'dist/**', 'deploy/**'],
  },
]
