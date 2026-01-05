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
      'preserve-caught-error': 'off',
      'max-lines': 'off', //TODO: Sort this rule out eventually
      '@typescript-eslint/no-magic-numbers': 'off', //TODO: Sort this rule out eventually
    },
  },
  {
    files: ['test/public/slideshow/**/*.js', 'test/public/slideshow/**/*.ts'],
    rules: {
      'max-lines': 'error', //TODO: Sort this rule out eventually
    },
  },
  {
    ignores: ['coverage/**', 'eslint.config.mjs'],
  },
]
