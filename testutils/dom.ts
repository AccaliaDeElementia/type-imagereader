'use sanity'

import type { JSDOM } from 'jsdom'

import { cast } from './typeGuards.js'

let originalWindow: Window & typeof globalThis = global.window
let originalDocument: Document = global.document
let originalHTMLElementDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
  global,
  'HTMLElement',
)
let originalHTMLTemplateElementDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
  global,
  'HTMLTemplateElement',
)
let originalsCaptured = false

// `global.HTMLElement` and `global.HTMLTemplateElement` have to be installed
// too, or production `obj instanceof HTMLElement` checks fail against JSDOM's
// separate constructors. Descriptors rather than values are captured so that a
// future Node shipping its own natives still restores faithfully.
export function mountDom(dom: JSDOM): JSDOM {
  if (!originalsCaptured) {
    originalWindow = global.window
    originalDocument = global.document
    originalHTMLElementDescriptor = Object.getOwnPropertyDescriptor(global, 'HTMLElement')
    originalHTMLTemplateElementDescriptor = Object.getOwnPropertyDescriptor(global, 'HTMLTemplateElement')
    originalsCaptured = true
  }
  global.window = cast<Window & typeof globalThis>(dom.window)
  global.document = dom.window.document
  Object.defineProperty(global, 'HTMLElement', {
    configurable: true,
    writable: true,
    value: dom.window.HTMLElement,
  })
  Object.defineProperty(global, 'HTMLTemplateElement', {
    configurable: true,
    writable: true,
    value: dom.window.HTMLTemplateElement,
  })
  return dom
}

export function unmountDom(): void {
  global.window = originalWindow
  global.document = originalDocument
  /* istanbul ignore else -- the else branch only fires if Node ships its own
     native HTMLElement, which it doesn't today; kept for forward-compatibility */
  if (originalHTMLElementDescriptor === undefined) {
    Reflect.deleteProperty(global, 'HTMLElement')
  } else {
    Object.defineProperty(global, 'HTMLElement', originalHTMLElementDescriptor)
  }
  /* istanbul ignore else -- the else branch only fires if Node ships its own
     native HTMLTemplateElement, which it doesn't today; kept for forward-compatibility */
  if (originalHTMLTemplateElementDescriptor === undefined) {
    Reflect.deleteProperty(global, 'HTMLTemplateElement')
  } else {
    Object.defineProperty(global, 'HTMLTemplateElement', originalHTMLTemplateElementDescriptor)
  }
}
