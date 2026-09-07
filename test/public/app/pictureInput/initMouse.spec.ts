'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { Imports, initMouse, Panning } from '#public/scripts/app/pictureInput.js'
import assert from 'node:assert'
import { cast } from '#testutils/typeGuards.js'
import { hasValue } from '#utils/helpers.js'
import type { MockInstance } from 'vitest'

interface TestVisualViewport {
  scale: number
}

describe('public/app/pictures initMouse()', () => {
  let dom = new JSDOM('<html><body><div id="bigImage"><img class="hidden"/></div></body></html>', {})
  let publishStub: MockInstance = vi.fn()
  let visualViewport: TestVisualViewport = { scale: 1 }
  let boundingRect = {
    x: 0,
    y: 0,
    width: 1024,
    height: 768,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }
  beforeEach(() => {
    dom = new JSDOM('<html><body><div id="bigImage"><img class="hidden"/></div></body></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    Pictures.mainImage = dom.window.document.querySelector('img')
    visualViewport = { scale: 1 }
    // @ts-expect-error Ignore that visualviewport is read-only
    dom.window.visualViewport = visualViewport
    boundingRect = {
      x: 0,
      y: 0,
      width: 1024,
      height: 768,
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }
    const tgt = Pictures.mainImage?.parentElement
    assert(hasValue(tgt))
    vi.spyOn(tgt, 'getBoundingClientRect').mockImplementation(() => cast<DOMRect>(boundingRect))
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    vi.spyOn(Imports, 'getPanTarget').mockReturnValue(null)
    Panning.target = null
    Panning.moved = false

    assert(Pictures.mainImage !== null)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should ignore clicks when visual viewport was null at init time and any scale is present at click time', () => {
    // @ts-expect-error Ignore that visualviewport is read-only
    dom.window.visualViewport = null
    initMouse()
    // @ts-expect-error Ignore that visualviewport is read-only
    dom.window.visualViewport = visualViewport
    visualViewport.scale = 1
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Ignored Mouse Click').length).toBe(1)
  })
  it('should navigate to previous from left area click', () => {
    visualViewport.scale = 2
    initMouse()
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Action:Execute:Previous').length).toBe(1)
  })
  it('should process click when current scale is zoomed out from initial', () => {
    visualViewport.scale = 2
    initMouse()
    visualViewport.scale = 1
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Action:Execute:Previous').length).toBe(1)
  })
  it('should not navigate when current scale is zoomed in from initial', () => {
    visualViewport.scale = 2
    initMouse()
    visualViewport.scale = 2.0001
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Action:Execute:Previous').length).toBe(0)
  })
  it('should ignore click when current scale is zoomed in from initial', () => {
    visualViewport.scale = 2
    initMouse()
    visualViewport.scale = 2.0001
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Ignored Mouse Click').length).toBe(1)
  })
  it('should not navigate when mainImage bounding rect invalid', () => {
    visualViewport.scale = 2
    initMouse()
    const tgt = Pictures.mainImage?.parentElement
    Pictures.mainImage = null
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    tgt?.dispatchEvent(evt)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Action:Execute:Previous').length).toBe(0)
  })
  it('should ignore click when mainImage bounding rect invalid', () => {
    visualViewport.scale = 2
    initMouse()
    const tgt = Pictures.mainImage?.parentElement
    Pictures.mainImage = null
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    tgt?.dispatchEvent(evt)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Ignored Mouse Click').length).toBe(1)
  })
  it('should not navigate when click target width is zero', () => {
    visualViewport.scale = 2
    initMouse()
    boundingRect.width = 0
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Action:Execute:Previous').length).toBe(0)
  })
  it('should ignore click when click target width is zero', () => {
    visualViewport.scale = 2
    initMouse()
    boundingRect.width = 0
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Ignored Mouse Click').length).toBe(1)
  })
  it('should show menu from middle area click', () => {
    visualViewport.scale = 2
    initMouse()
    const evt = new dom.window.MouseEvent('click', {
      clientX: boundingRect.width / 2,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Action:Execute:ShowMenu').length).toBe(1)
  })
  it('should navigate to next from right area click', () => {
    visualViewport.scale = 2
    initMouse()
    const evt = new dom.window.MouseEvent('click', {
      clientX: (3 * boundingRect.width) / 4,
      clientY: boundingRect.height / 2,
    })
    Pictures.mainImage?.parentElement?.dispatchEvent(evt)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Action:Execute:Next').length).toBe(1)
  })

  describe('drag to pan', () => {
    const PAN_ORIGIN_X = 400
    const PAN_ORIGIN_Y = 300
    const VISIBLE_WIDTH = 1000
    const VISIBLE_HEIGHT = 700
    let panTarget = {
      scrollLeft: 0,
      scrollTop: 0,
      clientWidth: VISIBLE_WIDTH,
      clientHeight: VISIBLE_HEIGHT,
      classList: { add: vi.fn(), remove: vi.fn() },
      getBoundingClientRect: (): DOMRect => cast<DOMRect>(boundingRect),
    }
    let container: HTMLElement | null = null
    const press = (clientX: number, clientY: number): MouseEvent => {
      const evt = new dom.window.MouseEvent('mousedown', { clientX, clientY, cancelable: true })
      container?.dispatchEvent(evt)
      return evt
    }
    const move = (clientX: number, clientY: number): void => {
      dom.window.document.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX, clientY }))
    }
    const release = (): void => {
      dom.window.document.dispatchEvent(new dom.window.MouseEvent('mouseup'))
    }
    const tap = (clientX: number, clientY: number): void => {
      container?.dispatchEvent(new dom.window.MouseEvent('click', { clientX, clientY }))
    }
    beforeEach(() => {
      panTarget = {
        scrollLeft: 100,
        scrollTop: 200,
        clientWidth: VISIBLE_WIDTH,
        clientHeight: VISIBLE_HEIGHT,
        classList: { add: vi.fn(), remove: vi.fn() },
        getBoundingClientRect: (): DOMRect => cast<DOMRect>(boundingRect),
      }
      vi.spyOn(Imports, 'getPanTarget').mockReturnValue(cast<HTMLElement>(panTarget))
      container = Pictures.mainImage?.parentElement ?? null
      visualViewport.scale = 1
      initMouse()
    })

    it('should pan left as the pointer moves right', () => {
      press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      move(PAN_ORIGIN_X + 50, PAN_ORIGIN_Y)
      expect(panTarget.scrollLeft).toBe(50)
    })
    it('should pan up as the pointer moves down', () => {
      press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      move(PAN_ORIGIN_X, PAN_ORIGIN_Y + 80)
      expect(panTarget.scrollTop).toBe(120)
    })
    // Without this the browser starts its own image drag-and-drop and the pan
    // turns into a ghost image stuck to the cursor.
    it('should suppress the native image drag', () => {
      const evt = press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      expect(evt.defaultPrevented).toBe(true)
    })
    it('should mark the container as panning', () => {
      press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      expect(panTarget.classList.add.mock.calls).toEqual([['panning']])
    })
    it('should unmark the container when the drag ends', () => {
      press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      release()
      expect(panTarget.classList.remove.mock.calls).toEqual([['panning']])
    })
    it('should stop panning once the button is released', () => {
      press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      release()
      move(PAN_ORIGIN_X + 300, PAN_ORIGIN_Y)
      expect(panTarget.scrollLeft).toBe(100)
    })
    it('should ignore movement that never started with a press', () => {
      move(PAN_ORIGIN_X + 300, PAN_ORIGIN_Y)
      expect(panTarget.scrollLeft).toBe(100)
    })
    // Both handlers sit on the document rather than the image. Dispatching from
    // outside #bigImage proves it: were they bound to the image, a drag that
    // wandered off it would freeze mid-pan and never register its release.
    const moveOutsideImage = (clientX: number): void => {
      dom.window.document.body.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX, bubbles: true }))
    }
    it('should keep panning once the pointer has left the image', () => {
      press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      moveOutsideImage(PAN_ORIGIN_X + 50)
      expect(panTarget.scrollLeft).toBe(50)
    })
    it('should stop panning when the button is released outside the image', () => {
      press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      dom.window.document.body.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true }))
      move(PAN_ORIGIN_X + 300, PAN_ORIGIN_Y)
      expect(panTarget.scrollLeft).toBe(100)
    })
    // A drag that ends over the image would otherwise also read as a tap and
    // turn the page out from under the reader.
    it('should suppress the navigation click after a drag', () => {
      press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      move(PAN_ORIGIN_X + 50, PAN_ORIGIN_Y)
      release()
      tap(boundingRect.width / 4, boundingRect.height / 2)
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Action:Execute:Previous').length).toBe(0)
    })
    it('should report the suppressed click as ignored', () => {
      press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      move(PAN_ORIGIN_X + 50, PAN_ORIGIN_Y)
      release()
      tap(boundingRect.width / 4, boundingRect.height / 2)
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Ignored Mouse Click').length).toBe(1)
    })
    it('should still navigate when the press barely moved', () => {
      press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      move(PAN_ORIGIN_X + 2, PAN_ORIGIN_Y + 2)
      release()
      tap(boundingRect.width / 4, boundingRect.height / 2)
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Action:Execute:Previous').length).toBe(1)
    })
    it('should navigate again on the click after a drag', () => {
      press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      move(PAN_ORIGIN_X + 50, PAN_ORIGIN_Y)
      release()
      tap(boundingRect.width / 4, boundingRect.height / 2)
      press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
      release()
      tap(boundingRect.width / 4, boundingRect.height / 2)
      expect(publishStub.mock.calls.filter((c) => c[0] === 'Action:Execute:Previous').length).toBe(1)
    })
    it('should not pan from a secondary button press', () => {
      const evt = new dom.window.MouseEvent('mousedown', { clientX: PAN_ORIGIN_X, clientY: PAN_ORIGIN_Y, button: 2 })
      container?.dispatchEvent(evt)
      move(PAN_ORIGIN_X + 50, PAN_ORIGIN_Y)
      expect(panTarget.scrollLeft).toBe(100)
    })
    // The browser is already scrolling from a scrollbar drag; joining in would
    // move the image at double speed.
    it('should not pan from a press on the vertical scrollbar', () => {
      press(VISIBLE_WIDTH + 5, PAN_ORIGIN_Y)
      move(VISIBLE_WIDTH + 5, PAN_ORIGIN_Y + 50)
      expect(panTarget.scrollTop).toBe(200)
    })
    it('should not pan from a press on the horizontal scrollbar', () => {
      press(PAN_ORIGIN_X, VISIBLE_HEIGHT + 5)
      move(PAN_ORIGIN_X + 50, VISIBLE_HEIGHT + 5)
      expect(panTarget.scrollLeft).toBe(100)
    })

    describe('with actual size mode off', () => {
      // The handlers registered above resolve the pan target on each event, so
      // re-stubbing is enough — calling initMouse again would double every
      // listener and with it every published action.
      beforeEach(() => {
        vi.spyOn(Imports, 'getPanTarget').mockReturnValue(null)
      })
      it('should not pan', () => {
        press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
        move(PAN_ORIGIN_X + 50, PAN_ORIGIN_Y)
        expect(panTarget.scrollLeft).toBe(100)
      })
      it('should leave the navigation click alone', () => {
        press(PAN_ORIGIN_X, PAN_ORIGIN_Y)
        move(PAN_ORIGIN_X + 50, PAN_ORIGIN_Y)
        release()
        tap(boundingRect.width / 4, boundingRect.height / 2)
        expect(publishStub.mock.calls.filter((c) => c[0] === 'Action:Execute:Previous').length).toBe(1)
      })
    })
  })
})
