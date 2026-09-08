declare module '*/eslint.config.mjs' {
  const config: Array<{ files?: string[]; rules?: Record<string, unknown> }>
  export default config
}
