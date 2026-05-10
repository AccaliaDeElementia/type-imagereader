'use sanity'

import type { JSDOM } from 'jsdom'

import { cast } from './typeGuards.js'

let originalWindow: Window & typeof globalThis = global.window
let originalDocument: Document = global.document
let originalHTMLElementDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
  global,
  'HTMLElement',
)
let originalsCaptured = false

// Install dom.window/dom.window.document onto the Node globals. Captures
// the originals on first call; subsequent calls (e.g. from later beforeEach
// hooks) reuse the captured originals so that unmount always restores the
// state from before the very first mount.
//
// Also installs `global.HTMLElement` so production code that checks
// `obj instanceof HTMLElement` resolves correctly under JSDOM. The descriptor
// (rather than just the value) is captured so that, if a future Node ships
// its own native HTMLElement, unmount restores it faithfully.
export function mountDom(dom: JSDOM): JSDOM {
  if (!originalsCaptured) {
    originalWindow = global.window
    originalDocument = global.document
    originalHTMLElementDescriptor = Object.getOwnPropertyDescriptor(global, 'HTMLElement')
    originalsCaptured = true
  }
  global.window = cast<Window & typeof globalThis>(dom.window)
  global.document = dom.window.document
  Object.defineProperty(global, 'HTMLElement', {
    configurable: true,
    writable: true,
    value: dom.window.HTMLElement,
  })
  return dom
}

// Restore the global.window/global.document/global.HTMLElement captured at
// first mount. Safe to call without a prior mount: the seed values match the
// module-load global state, so the restore is a no-op effectively.
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
}
