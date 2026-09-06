'use sanity'

import { getShowOriginalSize as _getShowOriginalSize } from './sizeFilter.js'
import { subscribe as _subscribe } from './pubsub.js'

export const Imports = {
  getShowOriginalSize: _getShowOriginalSize,
  subscribe: _subscribe,
}

// A stepped scroll leaves a tenth of the previous screenful in view so there is
// some overlap to read across rather than a jump to wholly new content.
const STEP_FRACTION = 0.9
// A nudge is the fine adjustment for when a full step left a panel straddling
// the edge of the screen.
const NUDGE_FRACTION = 0.2
// Scroll offsets are fractional on a zoomed or fractionally scaled display, so
// testing for an edge needs slack or the last step moves nothing at all.
const EDGE_TOLERANCE = 1
const SCROLL_ORIGIN = 0

export interface ViewportSize {
  width: number
  height: number
}

// Which corner of the next picture the reader should arrive at. Moving forward
// they arrive at the start; stepping back they arrive at the end, so a picture
// resumes where they left it rather than restarting from the top.
export type EntryCorner = 'start' | 'end'

export const Viewport = {
  container: null as HTMLElement | null,
  entry: 'start' as EntryCorner,
}

export function init(): void {
  Viewport.container = document.querySelector<HTMLElement>('#bigImage')
  Internals.applySizeMode()
  Imports.subscribe('Pictures:SizeMode', async () => {
    Internals.applySizeMode()
    await Promise.resolve()
  })
}

// Actual size mode turns the viewer into a scroll container holding an image at
// its own dimensions; fit-screen mode goes back to a clipped box holding an
// image scaled to fit. All of that lives in the stylesheet, keyed off the class.
function applySizeMode(): void {
  if (Imports.getShowOriginalSize()) {
    Viewport.container?.classList.add('actualSize')
    return
  }
  Viewport.container?.classList.remove('actualSize')
  Internals.resetScroll()
}

export function resetScroll(): void {
  if (Viewport.container === null) return
  Viewport.container.scrollLeft = SCROLL_ORIGIN
  Viewport.container.scrollTop = SCROLL_ORIGIN
}

export function setEntryCorner(corner: EntryCorner): void {
  Viewport.entry = corner
}

export function viewportSize(): ViewportSize {
  return {
    width: Viewport.container?.clientWidth ?? SCROLL_ORIGIN,
    height: Viewport.container?.clientHeight ?? SCROLL_ORIGIN,
  }
}

// Only actual size mode has anything to pan; in fit-screen mode the image is
// always wholly visible and every input belongs to navigation.
export function getPanTarget(): HTMLElement | null {
  if (!Imports.getShowOriginalSize()) return null
  return Viewport.container
}

function maxScrollTop(element: HTMLElement): number {
  return element.scrollHeight - element.clientHeight
}

function maxScrollLeft(element: HTMLElement): number {
  return element.scrollWidth - element.clientWidth
}

function canScrollDown(element: HTMLElement): boolean {
  return element.scrollTop < maxScrollTop(element) - EDGE_TOLERANCE
}

function canScrollUp(element: HTMLElement): boolean {
  return element.scrollTop > SCROLL_ORIGIN + EDGE_TOLERANCE
}

function canScrollRight(element: HTMLElement): boolean {
  return element.scrollLeft < maxScrollLeft(element) - EDGE_TOLERANCE
}

function canScrollLeft(element: HTMLElement): boolean {
  return element.scrollLeft > SCROLL_ORIGIN + EDGE_TOLERANCE
}

// Offsets are clamped here rather than left to the browser so the arithmetic
// holds however the caller sizes its move.
function verticalOffset(element: HTMLElement, fraction: number): number {
  const distance = element.clientHeight * fraction
  return Math.min(Math.max(element.scrollTop + distance, SCROLL_ORIGIN), maxScrollTop(element))
}

function horizontalOffset(element: HTMLElement, fraction: number): number {
  const distance = element.clientWidth * fraction
  return Math.min(Math.max(element.scrollLeft + distance, SCROLL_ORIGIN), maxScrollLeft(element))
}

// Walk the picture the way it is read: down the current column, then across to
// the top of the next one. An image that only overflows vertically never
// reaches the sideways step, and one that only overflows horizontally starts at
// it, so a single rule covers every combination. Reports whether the input was
// consumed; false means the picture is exhausted and the caller should navigate.
export function scrollForward(): boolean {
  const element = getPanTarget()
  if (element === null) return false
  if (canScrollDown(element)) {
    element.scrollTop = verticalOffset(element, STEP_FRACTION)
    return true
  }
  if (canScrollRight(element)) {
    element.scrollLeft = horizontalOffset(element, STEP_FRACTION)
    element.scrollTop = SCROLL_ORIGIN
    return true
  }
  return false
}

// The exact reverse of scrollForward, which means stepping back across lands at
// the foot of the previous column rather than its head.
export function scrollBackward(): boolean {
  const element = getPanTarget()
  if (element === null) return false
  if (canScrollUp(element)) {
    element.scrollTop = verticalOffset(element, -STEP_FRACTION)
    return true
  }
  if (canScrollLeft(element)) {
    element.scrollLeft = horizontalOffset(element, -STEP_FRACTION)
    element.scrollTop = maxScrollTop(element)
    return true
  }
  return false
}

// Up and Down fine-tune the vertical position when a full step has left a panel
// straddling the edge of the screen. Unlike the stepped walk they never move
// between columns: handing the input back at the top and bottom edges is what
// keeps the menu reachable from the keyboard in actual size mode.
export function nudgeUp(): boolean {
  const element = getPanTarget()
  if (element === null) return false
  if (!canScrollUp(element)) return false
  element.scrollTop = verticalOffset(element, -NUDGE_FRACTION)
  return true
}

export function nudgeDown(): boolean {
  const element = getPanTarget()
  if (element === null) return false
  if (!canScrollDown(element)) return false
  element.scrollTop = verticalOffset(element, NUDGE_FRACTION)
  return true
}

// Take up the arrival position recorded for this picture. Called once the image
// has decoded, since until then there is nothing to scroll over. Arriving at the
// end means the far corner — the bottom of the last column — which is exactly
// where scrollForward would have run out, so a reader stepping back lands where
// they would have been had they walked there. The arrival is consumed so that a
// later reload of the same picture starts from the top again.
export function applyEntryScroll(): void {
  const element = Viewport.container
  if (element === null) return
  if (Viewport.entry === 'end') {
    element.scrollLeft = maxScrollLeft(element)
    element.scrollTop = maxScrollTop(element)
  } else {
    element.scrollLeft = SCROLL_ORIGIN
    element.scrollTop = SCROLL_ORIGIN
  }
  Viewport.entry = 'start'
}

export const Internals = {
  applySizeMode,
  resetScroll,
}
