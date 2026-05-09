'use sanity'

import type { JSDOM } from 'jsdom'

import { cast } from './typeGuards.js'

let originalWindow: Window & typeof globalThis = global.window
let originalDocument: Document = global.document
let originalsCaptured = false

// Install dom.window/dom.window.document onto the Node globals. Captures
// the originals on first call; subsequent calls (e.g. from later beforeEach
// hooks) reuse the captured originals so that unmount always restores the
// state from before the very first mount.
export function mountDom(dom: JSDOM): JSDOM {
  if (!originalsCaptured) {
    originalWindow = global.window
    originalDocument = global.document
    originalsCaptured = true
  }
  global.window = cast<Window & typeof globalThis>(dom.window)
  global.document = dom.window.document
  return dom
}

// Restore the global.window and global.document captured at first mount.
// Safe to call without a prior mount: the seed values match the module-load
// global state, so the restore is a no-op effectively.
export function unmountDom(): void {
  global.window = originalWindow
  global.document = originalDocument
}
