module.exports = {
  env: {
    es2022: true,
    node: true
  },
  extends: [
    'eslint-config-standard-with-typescript'
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
    "@typescript-eslint/no-extraneous-class": "off", //TODO: sort this out at some point...
    "@typescript-eslint/consistent-indexed-object-style": "off", //TODO: sort this out at some point...
    "@typescript-eslint/no-floating-promises": "error"
  },
  ignorePatterns: [
    '**/*.min.js',
    '.eslintrc.js',
    'coverage/**'
  ]
}
