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
      eqeqeq: 'off',
      'no-plusplus': 'off',
      'no-await-in-loop': 'off',
      'no-param-reassign': 'off',
      '@typescript-eslint/no-magic-numbers': 'off', //TODO: Sort this rule out eventually
      '@typescript-eslint/prefer-destructuring': 'off', //This hurts readability, at least as this project is designed
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['test/**/*.js', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off', //TODO: Sort this rule out eventually
      '@typescript-eslint/strict-void-return': 'off', // TODO: Remove this rule once the typescript defs for mocha get updated to mark the callback as optionally awaitable
    },
  },
  {
    ignores: ['coverage/**', 'eslint.config.mjs'],
  },
]
