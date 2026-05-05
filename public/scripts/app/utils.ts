import { HasValue } from '#utils/helpers.js'

function isHTMLTemplateElement(obj: HTMLElement | DocumentFragment): obj is HTMLTemplateElement {
  return obj.nodeName === 'TEMPLATE' && 'content' in obj && obj.content !== null
}

function isElement(obj: unknown): obj is Element {
  return obj !== null && typeof obj === 'object' && 'firstElementChild' in obj
}

export function isHTMLElement(obj: unknown): obj is HTMLElement {
  return obj !== null && typeof obj === 'object' && 'style' in obj
}

export function CloneNode<T extends HTMLElement>(
  source: T | DocumentFragment | undefined | null,
  isT: (obj: Element | null) => obj is T,
): T | undefined {
  const clone = (HasValue(source) && isHTMLTemplateElement(source) ? source.content : source)?.cloneNode(true)
  if (!isElement(clone)) return undefined
  const elem = clone.firstElementChild
  return isT(elem) ? elem : undefined
}
