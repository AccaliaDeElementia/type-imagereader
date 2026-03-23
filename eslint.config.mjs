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
      'require-unicode-regexp': 'off', // TODO: Requires updating to newer version of js than browserify supports at present
      '@typescript-eslint/prefer-destructuring': [
        'error',
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
      '@typescript-eslint/strict-void-return': 'off', // TODO: Enable once Mocha updates typedefintions to not conflict with this rule
      '@typescript-eslint/no-magic-numbers': 'off', //TODO: Sort this rule out eventually
    },
  },
  {
    ignores: ['coverage/**', 'eslint.config.mjs'],
  },
]
