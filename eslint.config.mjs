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
      '@typescript-eslint/no-magic-numbers': 'off', //TODO: Sort this rule out eventually
      '@typescript-eslint/prefer-destructuring': 'off', //This hurts readability, at least as this project is designed
      '@typescript-eslint/no-floating-promises': 'error',
      'max-lines': 'off', //TODO: Sort this rule out eventually
    },
  },
  {
    files: ['test/**/*.js', 'test/**/*.ts'],
    rules: {
      'max-nested-callbacks': ['error', { max: 5 }], // allow deeper nesting for mocha.... for now
      'max-lines': 'off', //TODO: Sort this rule out eventually
      '@typescript-eslint/no-magic-numbers': 'off', //TODO: Sort this rule out eventually
      '@typescript-eslint/class-methods-use-this': 'off', //TODO: Convert to standard BDD spec to avoid class shenanigans.... until then this is the fix....
    },
  },
  {
    ignores: ['coverage/**', 'eslint.config.mjs'],
  },
]
