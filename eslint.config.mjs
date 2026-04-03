import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import love from 'eslint-config-love'
import eslintConfigPrettier from 'eslint-config-prettier'

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
    rules: {
      '@typescript-eslint/strict-void-return': 'off', // Chai assertions and Sinon spies idiomatically return values in void contexts
      '@typescript-eslint/no-magic-numbers': 'off', //TODO: Sort this rule out eventually
    },
  },
  {
    ignores: ['coverage/**', 'eslint.config.mjs', 'dist/**'],
  },
]
