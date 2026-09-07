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

interface ScrollPosition {
  left: number
  top: number
}

export type Arrival = 'freshStart' | 'resumeFromEnd'

export type InputDisposition = 'consumed' | 'exhausted'

const ACTUAL_SIZE_CLASS = 'actualSize'

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

function applySizeMode(): void {
  if (Imports.getShowOriginalSize()) {
    Viewport.container?.classList.add(ACTUAL_SIZE_CLASS)
    return
  }
  Viewport.container?.classList.remove(ACTUAL_SIZE_CLASS)
  Internals.resetScroll()
}

const ORIGIN: ScrollPosition = { left: SCROLL_ORIGIN, top: SCROLL_ORIGIN }

function farCorner(element: HTMLElement): ScrollPosition {
  return { left: maxScrollLeft(element), top: maxScrollTop(element) }
}

export function resetScroll(): void {
  const element = Viewport.container
  if (element === null) return
  element.scrollLeft = ORIGIN.left
  element.scrollTop = ORIGIN.top
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

function downColumn(element: HTMLElement, fraction: number): ScrollPosition {
  return { left: element.scrollLeft, top: clampedVerticalOffset(element, fraction) }
}

function nextColumnHead(element: HTMLElement): ScrollPosition {
  return { left: clampedHorizontalOffset(element, STEP_FRACTION), top: SCROLL_ORIGIN }
}

function previousColumnFoot(element: HTMLElement): ScrollPosition {
  return { left: clampedHorizontalOffset(element, -STEP_FRACTION), top: maxScrollTop(element) }
}

type PanPolicy = (element: HTMLElement) => ScrollPosition | null

function nextForwardPosition(element: HTMLElement): ScrollPosition | null {
  if (canScrollDown(element)) return downColumn(element, STEP_FRACTION)
  if (canScrollRight(element)) return nextColumnHead(element)
  return null
}

function nextBackwardPosition(element: HTMLElement): ScrollPosition | null {
  if (canScrollUp(element)) return downColumn(element, -STEP_FRACTION)
  if (canScrollLeft(element)) return previousColumnFoot(element)
  return null
}

function nudgedUpPosition(element: HTMLElement): ScrollPosition | null {
  return canScrollUp(element) ? downColumn(element, -NUDGE_FRACTION) : null
}

function nudgedDownPosition(element: HTMLElement): ScrollPosition | null {
  return canScrollDown(element) ? downColumn(element, NUDGE_FRACTION) : null
}

function panBy(choosePosition: PanPolicy): InputDisposition {
  const element = getPanTarget()
  if (element === null) return 'exhausted'
  const position = choosePosition(element)
  if (position === null) return 'exhausted'
  element.scrollLeft = position.left
  element.scrollTop = position.top
  return 'consumed'
}

export function scrollForward(): InputDisposition {
  return panBy(nextForwardPosition)
}

export function scrollBackward(): InputDisposition {
  return panBy(nextBackwardPosition)
}

export function nudgeUp(): InputDisposition {
  return panBy(nudgedUpPosition)
}

export function nudgeDown(): InputDisposition {
  return panBy(nudgedDownPosition)
}

// The far corner is where scrollForward runs out, so resuming there puts the
// reader where a forward walk would have left them.
export function applyEntryScroll(): void {
  const element = Viewport.container
  if (element === null) return
  const position = Viewport.arrival === 'resumeFromEnd' ? farCorner(element) : ORIGIN
  element.scrollLeft = position.left
  element.scrollTop = position.top
  Viewport.arrival = 'freshStart'
}

export const Internals = {
  applySizeMode,
  resetScroll,
}
