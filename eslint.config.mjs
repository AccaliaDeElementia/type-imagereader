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
      '@typescript-eslint/no-extraneous-class': 'off', //TODO: sort this out at some point...
      '@typescript-eslint/consistent-indexed-object-style': 'off', //TODO: sort this out at some point...
      '@typescript-eslint/no-magic-numbers': 'off', //TODO: Sort this rule out eventually
      '@typescript-eslint/prefer-destructuring': 'off', //TODO: Sort this rule out eventually
      '@typescript-eslint/no-floating-promises': 'error',
      'max-lines': 'off', //TODO: Sort this rule out eventually
      //'no-console': 'warn', // only set for debugging!
    },
  },
  {
    files: ['test/**/*.js', 'test/**/*.ts'],
    rules: {
      'max-lines': 'off', //TODO: Sort this rule out eventually
      '@typescript-eslint/class-methods-use-this': 'off', //TODO: Convert to standard BDD spec to avoid class shenanigans.... until then this is the fix....
      '@typescript-eslint/no-unsafe-call': 'off', // TODO: Sinon asserts throw this a lot..... figure out a better way to implement those and avoid disabling this error
      '@typescript-eslint/no-unsafe-assignment': 'off', // TODO: Sinon asserts throw this a lot..... figure out a better way to implement those and avoid disabling this error
      '@typescript-eslint/no-unsafe-member-access': 'off', // TODO: Sinon asserts throw this a lot..... figure out a better way to implement those and avoid disabling this error
      '@typescript-eslint/no-unsafe-type-assertion': 'off', // TODO: Type assertions for Knex and Debugger trigger this a bunch. figure out a better way to implement tests to avoid
    },
  },
  {
    ignores: ['coverage/**', 'eslint.config.mjs'],
  },
]
