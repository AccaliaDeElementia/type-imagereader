declare module 'minify-stream' {
  export default function minifyStream (options?: undefined | {
      compress?: {
        ecma?: number,
        passes?: number
      },
      sourceMap?: boolean
    }): any
}
