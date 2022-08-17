/* globals module */
module.exports = {
  env: {
    es2022: true,
    node: true,
    browser: true
  },
  extends: [
    'standard'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
  },
  ignorePatterns: [
    '**/*.min.js'
  ]
}
