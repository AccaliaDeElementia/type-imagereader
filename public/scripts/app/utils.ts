'use sanity'

function isElement(obj: unknown): obj is Element {
  return obj !== null && typeof obj === 'object' && 'firstElementChild' in obj
}

export function cloneNode<T extends HTMLElement>(
  source: T | DocumentFragment | undefined | null,
  isT: (obj: Element | null) => obj is T,
): T | undefined {
  const clone = (source instanceof HTMLTemplateElement ? source.content : source)?.cloneNode(true)
  if (!isElement(clone)) return undefined
  const elem = clone.firstElementChild
  return isT(elem) ? elem : undefined
}
