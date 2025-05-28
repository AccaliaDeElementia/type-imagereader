'use sanity'

export function isHTMLElement(obj: unknown): obj is HTMLElement {
  // TODO: Work out a better heuristic that works in Nodejs (JSDOM for tests) and in the browser
  return obj != null && typeof obj === 'object' && 'style' in obj
}
