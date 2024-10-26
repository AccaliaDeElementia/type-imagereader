module.exports = {
  env: {
    es2022: true,
    node: true
  },
  extends: [
    'standard'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    project: true,
    tsconfigRootDir: __dirname, // or import.meta.dirname for ESM
  },
  plugins: [
    '@typescript-eslint'
  ],

  rules: {
    "@typescript-eslint/no-floating-promises": "error"
  },
  ignorePatterns: [
    '**/*.min.js',
    '.eslintrc.js',
    'coverage/**'
  ]
}
