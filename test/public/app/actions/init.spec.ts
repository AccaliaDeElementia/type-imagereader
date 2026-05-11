'use sanity'

import Sinon from 'sinon'

import { PubSub } from '#public/scripts/app/pubsub.js'
import { Actions, init, Internals } from '#public/scripts/app/actions.js'

import { cast } from '#testutils/typeGuards.js'
import { getSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import type { Listing } from '#contracts/listing.js'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('public/app/actions init()', () => {
  const dom: JSDOM = new JSDOM('', {})
  let BuildActionsSpy = sandbox.stub()
  let GamepadResetSpy = sandbox.stub()

  beforeEach(() => {
    mountDom(dom)
    resetPubSub()
    BuildActionsSpy = sandbox.stub(Internals, 'buildActions')
    GamepadResetSpy = sandbox.stub(Actions.gamepads, 'reset')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should build actions on init', () => {
    init()
    expect(BuildActionsSpy.called).toBe(true)
  })
  it('should reset gamepads on init', () => {
    init()
    expect(GamepadResetSpy.called).toBe(true)
  })
  it('should subscribe to Navigate:Data', () => {
    init()
    expect(PubSub.subscribers['NAVIGATE:DATA']).toHaveLength(1)
  })
  const navigateDataTestCases: Array<[string, Listing, boolean]> = [
    ['null', cast<Listing>(null), false],
    ['undefined', cast<Listing>(undefined), false],
    ['boolean', cast<Listing>(false), false],
    ['number', cast<Listing>(1701), false],
    ['string', cast<Listing>('Enterprise'), false],
    ['array', cast<Listing>([null]), false],
    ['empty object', cast<Listing>({}), false],
    [
      'unset pictures with unset children',
      {
        name: '',
        path: '',
        parent: '',
      },
      true,
    ],
    [
      'undefined pictures with unset children',
      {
        name: '',
        path: '',
        parent: '',
        pictures: undefined,
      },
      true,
    ],
    [
      'empty pictures with unset children',
      {
        name: '',
        path: '',
        parent: '',
        pictures: [],
      },
      true,
    ],
    [
      'unset pictures with unset children',
      {
        name: '',
        path: '',
        parent: '',
      },
      true,
    ],
    [
      'unset pictures with undefined children',
      {
        name: '',
        path: '',
        parent: '',
        children: undefined,
      },
      true,
    ],
    [
      'unset pictures with empty children',
      {
        name: '',
        path: '',
        parent: '',
        children: [],
      },
      true,
    ],
    [
      'empty pictures with set children',
      {
        name: '',
        path: '',
        parent: '',
        pictures: [],
        children: [{ name: '', path: '', cover: null, totalCount: 10, seenCount: 0 }],
      },
      false,
    ],
    [
      'set pictures with empty children',
      {
        name: '',
        path: '',
        parent: '',
        pictures: [{ name: '', path: '', seen: true }],
        children: [],
      },
      false,
    ],
    [
      'set pictures with set children',
      {
        name: '',
        path: '',
        parent: '',
        pictures: [{ name: '', path: '', seen: true }],
        children: [{ name: '', path: '', cover: null, totalCount: 10, seenCount: 0 }],
      },
      false,
    ],
    [
      'empty pictures with empty children',
      {
        name: '',
        path: '',
        parent: '',
        pictures: [],
        children: [],
      },
      true,
    ],
  ]
  navigateDataTestCases.forEach(([title, listing, expected]) => {
    const doNavigate = async (): Promise<Sinon.SinonStub> => {
      init()
      const handler = getSubscriber('NAVIGATE:DATA')
      const spy = sandbox.stub().resolves()
      PubSub.subscribers['TAB:SELECT'] = [spy]
      await handler(listing)
      return spy
    }
    it(`should ${expected ? '' : 'not '}publish Tab:Select for ${title} listing on navigate`, async () => {
      const spy = await doNavigate()
      expect(spy.called).toBe(expected)
    })
    if (expected) {
      it(`should publish Tab:Select with expected args for ${title} listing on navigate`, async () => {
        const spy = await doNavigate()
        expect(spy.firstCall.args).toEqual(['Actions', 'TAB:SELECT'])
      })
    }
  })
  it('should add exactly one keyup event listener to document', () => {
    const spy = sandbox.stub(document, 'addEventListener')
    try {
      init()
      expect(spy.callCount).toBe(1)
    } finally {
      spy.restore()
    }
  })
  it('should add keyup event listener to document', () => {
    const spy = sandbox.stub(document, 'addEventListener')
    try {
      init()
      expect(spy.firstCall.calledWith('keyup')).toBe(true)
    } finally {
      spy.restore()
    }
  })
  const keyUpTestCases: Array<[KeyboardEventInit, string]> = [
    [{ altKey: false, ctrlKey: false, shiftKey: false, key: 'a' }, 'A'],
    [{ altKey: false, ctrlKey: false, shiftKey: true, key: 'b' }, '<SHIFT>B'],
    [{ altKey: true, ctrlKey: false, shiftKey: false, key: 'c' }, '<ALT>C'],
    [{ altKey: false, ctrlKey: true, shiftKey: false, key: 'd' }, '<CTRL>D'],
    [{ altKey: true, ctrlKey: false, shiftKey: true, key: 'e' }, '<ALT><SHIFT>E'],
    [{ altKey: false, ctrlKey: true, shiftKey: true, key: 'f' }, '<CTRL><SHIFT>F'],
    [{ altKey: true, ctrlKey: true, shiftKey: false, key: 'g' }, '<CTRL><ALT>G'],
    [{ altKey: true, ctrlKey: true, shiftKey: true, key: 'h' }, '<CTRL><ALT><SHIFT>H'],
  ]
  keyUpTestCases.forEach(([event, expected]) => {
    const doKeypress = (): Sinon.SinonStub => {
      const documentSpy = sandbox.stub(document, 'addEventListener')
      const spy = sandbox.stub().resolves()
      PubSub.subscribers['ACTION:KEYPRESS'] = [spy]
      let handler: (o: unknown) => void = (_) => {
        expect.fail('Base Function should not be called!')
      }
      documentSpy.callsFake((_, h) => {
        handler = cast<(o: unknown) => void>(h)
      })
      try {
        init()
        handler(event)
      } finally {
        documentSpy.restore()
      }
      return spy
    }
    it(`should publish ${expected} keypress event once`, () => {
      expect(doKeypress().callCount).toBe(1)
    })
    it(`should publish ${expected} keypress event with expected args`, () => {
      expect(doKeypress().firstCall.args).toEqual([expected, `ACTION:KEYPRESS:${expected}`])
    })
  })

  it('should add exactly two event listeners to window', () => {
    const spy = sandbox.stub(window, 'addEventListener')
    try {
      init()
      expect(spy.callCount).toBe(2)
    } finally {
      spy.restore()
    }
  })
  it('should add gamepadconnected event listener to window', () => {
    const spy = sandbox.stub(window, 'addEventListener')
    try {
      init()
      expect(spy.firstCall.calledWith('gamepadconnected')).toBe(true)
    } finally {
      spy.restore()
    }
  })

  it('should add readGamepad interval when gamepadConnected event fires', () => {
    const spy = sandbox.stub(window, 'addEventListener')
    try {
      init()
      cast<() => void>(spy.firstCall.args[1])()
      expect(PubSub.intervals.readGamepad).not.toBe(undefined)
    } finally {
      spy.restore()
    }
  })

  it('should readGamepad() when readGamepad interval fires', () => {
    const spy = sandbox.stub(window, 'addEventListener')
    const readspy = sandbox.stub(Internals, 'readGamepad')
    try {
      init()
      cast<() => void>(spy.firstCall.args[1])()
      assert(PubSub.intervals.readGamepad !== undefined)
      PubSub.intervals.readGamepad.method()
      expect(readspy.called).toBe(true)
    } finally {
      readspy.restore()
      spy.restore()
    }
  })
  it('should add gamepaddisconnected event listener to window', () => {
    const spy = sandbox.stub(window, 'addEventListener')
    try {
      init()
      expect(spy.secondCall.calledWith('gamepaddisconnected')).toBe(true)
    } finally {
      spy.restore()
    }
  })
  it('should remove readGamepad interval when gamepaddisconnected fires and no gamepads remain', () => {
    const addSpy = sandbox.stub(window, 'addEventListener')
    const existingNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => dom.window.navigator,
    })
    dom.window.navigator.getGamepads = sandbox.stub().returns([null, null])
    try {
      init()
      cast<() => void>(addSpy.firstCall.args[1])()
      assert(PubSub.intervals.readGamepad !== undefined)
      cast<() => void>(addSpy.secondCall.args[1])()
      expect(PubSub.intervals.readGamepad).toBe(undefined)
    } finally {
      Object.defineProperty(global, 'navigator', { configurable: true, get: () => existingNavigator })
      addSpy.restore()
    }
  })
  it('should keep readGamepad interval when gamepaddisconnected fires but other gamepads remain', () => {
    const addSpy = sandbox.stub(window, 'addEventListener')
    const existingNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => dom.window.navigator,
    })
    const fakePad = cast<Gamepad>({ id: 'pad' })
    dom.window.navigator.getGamepads = sandbox.stub().returns([fakePad, null])
    try {
      init()
      cast<() => void>(addSpy.firstCall.args[1])()
      assert(PubSub.intervals.readGamepad !== undefined)
      cast<() => void>(addSpy.secondCall.args[1])()
      expect(PubSub.intervals.readGamepad).not.toBe(undefined)
    } finally {
      Object.defineProperty(global, 'navigator', { configurable: true, get: () => existingNavigator })
      addSpy.restore()
    }
  })
})
