'use sanity'

export function isHTMLElement(obj: unknown): obj is HTMLElement {
  return typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement
}
