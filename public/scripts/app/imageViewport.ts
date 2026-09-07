'use sanity'

import { getShowOriginalSize as _getShowOriginalSize } from './sizeFilter.js'
import { subscribe as _subscribe } from './pubsub.js'

export const Imports = {
  getShowOriginalSize: _getShowOriginalSize,
  subscribe: _subscribe,
}

const SCREENFUL = 1
const STEP_OVERLAP = 0.1
const STEP_FRACTION = SCREENFUL - STEP_OVERLAP
const NUDGE_FRACTION = 0.2
// Browsers report fractional scroll offsets under page zoom and fractional
// display scaling.
const SUBPIXEL_TOLERANCE_PX = 1
const SCROLL_ORIGIN = 0

export interface ViewportSize {
  width: number
  height: number
}

export type Arrival = 'freshStart' | 'resumeFromEnd'

export const Viewport = {
  container: null as HTMLElement | null,
  arrival: 'freshStart' as Arrival,
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

export function setArrival(arrival: Arrival): void {
  Viewport.arrival = arrival
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
  return element.scrollTop < maxScrollTop(element) - SUBPIXEL_TOLERANCE_PX
}

function canScrollUp(element: HTMLElement): boolean {
  return element.scrollTop > SCROLL_ORIGIN + SUBPIXEL_TOLERANCE_PX
}

function canScrollRight(element: HTMLElement): boolean {
  return element.scrollLeft < maxScrollLeft(element) - SUBPIXEL_TOLERANCE_PX
}

function canScrollLeft(element: HTMLElement): boolean {
  return element.scrollLeft > SCROLL_ORIGIN + SUBPIXEL_TOLERANCE_PX
}

function clampedVerticalOffset(element: HTMLElement, fraction: number): number {
  const distance = element.clientHeight * fraction
  return Math.min(Math.max(element.scrollTop + distance, SCROLL_ORIGIN), maxScrollTop(element))
}

function clampedHorizontalOffset(element: HTMLElement, fraction: number): number {
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
    element.scrollTop = clampedVerticalOffset(element, STEP_FRACTION)
    return true
  }
  if (canScrollRight(element)) {
    element.scrollLeft = clampedHorizontalOffset(element, STEP_FRACTION)
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
    element.scrollTop = clampedVerticalOffset(element, -STEP_FRACTION)
    return true
  }
  if (canScrollLeft(element)) {
    element.scrollLeft = clampedHorizontalOffset(element, -STEP_FRACTION)
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
  element.scrollTop = clampedVerticalOffset(element, -NUDGE_FRACTION)
  return true
}

export function nudgeDown(): boolean {
  const element = getPanTarget()
  if (element === null) return false
  if (!canScrollDown(element)) return false
  element.scrollTop = clampedVerticalOffset(element, NUDGE_FRACTION)
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
  if (Viewport.arrival === 'resumeFromEnd') {
    element.scrollLeft = maxScrollLeft(element)
    element.scrollTop = maxScrollTop(element)
  } else {
    element.scrollLeft = SCROLL_ORIGIN
    element.scrollTop = SCROLL_ORIGIN
  }
  Viewport.arrival = 'freshStart'
}

export const Internals = {
  applySizeMode,
  resetScroll,
}
