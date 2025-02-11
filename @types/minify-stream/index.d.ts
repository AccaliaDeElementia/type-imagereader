declare module 'minify-stream' {
  export default function minifyStream (options?: {
    compress?: {
      ecma?: number
      passes?: number
    }
    sourceMap?: boolean
  }): string | Buffer
}
