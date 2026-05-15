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

// Install dom.window/dom.window.document onto the Node globals. Captures
// the originals on first call; subsequent calls (e.g. from later beforeEach
// hooks) reuse the captured originals so that unmount always restores the
// state from before the very first mount.
//
// Also installs `global.HTMLElement` and `global.HTMLTemplateElement` so
// production code that checks `obj instanceof HTMLElement` /
// `obj instanceof HTMLTemplateElement` resolves correctly under JSDOM. The
// descriptors (rather than just the values) are captured so that, if a
// future Node ships its own native constructors, unmount restores them
// faithfully.
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

// Restore the global.window/global.document/global.HTMLElement/
// global.HTMLTemplateElement captured at first mount. Safe to call without
// a prior mount: the seed values match the module-load global state, so
// the restore is a no-op effectively.
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
