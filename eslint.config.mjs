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
      'require-atomic-updates': 'error',
      'require-unicode-regexp': 'error',
      '@typescript-eslint/prefer-destructuring': [
        'warn',
        {
          array: true, // This makes sense and is good. avoids a lot of magic numbers too
          object: false, // This really hurts readability IMO. at the very least it bends my brain so dont enable this yet
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
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
      '@typescript-eslint/no-magic-numbers': 'off', //TODO: Sort this rule out eventually
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Sinon'][callee.property.name='stub']",
          message:
            'Do not use Sinon.stub() — it registers into the default sandbox and leaks across the full test run. Use sandbox.stub() via a per-describe sandbox (const sandbox = Sinon.createSandbox(), plus sandbox.restore() in afterEach).',
        },
      ],
      'local/no-method-stub-outside-hook': 'error',
    },
  },
  {
    ignores: ['coverage/**', 'coverage-vitest/**', 'eslint.config.mjs', 'dist/**', 'deploy/**'],
  },
]
