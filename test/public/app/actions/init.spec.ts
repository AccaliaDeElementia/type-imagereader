'use sanity'

import { Actions, Imports, init, Internals } from '#public/scripts/app/actions.js'

import { cast } from '#testutils/typeGuards.js'
import { capturedInterval, capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import type { Listing } from '#contracts/listing.js'
import type { MockInstance } from 'vitest'

describe('public/app/actions init()', () => {
  const dom: JSDOM = new JSDOM('', {})
  let BuildActionsSpy: MockInstance = vi.fn()
  let GamepadResetSpy: MockInstance = vi.fn()
  let subscribeStub: MockInstance = vi.fn()
  let addIntervalStub: MockInstance = vi.fn()
  let removeIntervalStub: MockInstance = vi.fn()

  beforeEach(() => {
    mountDom(dom)
    resetPubSub()
    BuildActionsSpy = vi.spyOn(Internals, 'buildActions').mockImplementation((..._args: unknown[]) => undefined)
    GamepadResetSpy = vi.spyOn(Actions.gamepads, 'reset').mockImplementation((..._args: unknown[]) => undefined)
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
    addIntervalStub = vi.spyOn(Imports, 'addInterval').mockImplementation((..._args: unknown[]) => undefined)
    removeIntervalStub = vi.spyOn(Imports, 'removeInterval').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should build actions on init', () => {
    init()
    expect(BuildActionsSpy.mock.calls.length > 0).toBe(true)
  })
  it('should reset gamepads on init', () => {
    init()
    expect(GamepadResetSpy.mock.calls.length > 0).toBe(true)
  })
  it('should subscribe to Navigate:Data', () => {
    init()
    expect(subscribeStub.mock.calls.some((c) => c[0] === 'Navigate:Data')).toBe(true)
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
    const doNavigate = async (): Promise<MockInstance> => {
      init()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Data')
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      await handler(listing)
      return publishStub
    }
    it(`should ${expected ? '' : 'not '}publish Tab:Select for ${title} listing on navigate`, async () => {
      const publishStub = await doNavigate()
      expect(publishStub.mock.calls.some((c) => c[0] === 'Tab:Select')).toBe(expected)
    })
    if (expected) {
      it(`should publish Tab:Select with expected args for ${title} listing on navigate`, async () => {
        const publishStub = await doNavigate()
        expect(publishStub.mock.calls[0]).toEqual(['Tab:Select', 'Actions'])
      })
    }
  })
  it('should add exactly one keyup event listener to document', () => {
    const spy = vi.spyOn(document, 'addEventListener').mockImplementation((..._args: unknown[]) => undefined)
    try {
      init()
      expect(spy.mock.calls.length).toBe(1)
    } finally {
      spy.mockRestore()
    }
  })
  it('should add keyup event listener to document', () => {
    const spy = vi.spyOn(document, 'addEventListener').mockImplementation((..._args: unknown[]) => undefined)
    try {
      init()
      expect(spy.mock.calls[0]?.[0]).toBe('keyup')
    } finally {
      spy.mockRestore()
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
    const doKeypress = (): MockInstance => {
      const documentSpy = vi.spyOn(document, 'addEventListener').mockImplementation((..._args: unknown[]) => undefined)
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      let handler: (o: unknown) => void = (_) => {
        expect.fail('Base Function should not be called!')
      }
      documentSpy.mockImplementation((_, h) => {
        handler = cast<(o: unknown) => void>(h)
      })
      try {
        init()
        handler(event)
      } finally {
        documentSpy.mockRestore()
      }
      return publishStub
    }
    it(`should publish ${expected} keypress event once`, () => {
      expect(doKeypress().mock.calls.length).toBe(1)
    })
    it(`should publish ${expected} keypress event with expected args`, () => {
      expect(doKeypress().mock.calls[0]).toEqual([`Action:Keypress:${expected}`, expected])
    })
  })

  it('should add exactly two event listeners to window', () => {
    const spy = vi.spyOn(window, 'addEventListener').mockImplementation((..._args: unknown[]) => undefined)
    try {
      init()
      expect(spy.mock.calls.length).toBe(2)
    } finally {
      spy.mockRestore()
    }
  })
  it('should add gamepadconnected event listener to window', () => {
    const spy = vi.spyOn(window, 'addEventListener').mockImplementation((..._args: unknown[]) => undefined)
    try {
      init()
      expect(spy.mock.calls[0]?.[0]).toBe('gamepadconnected')
    } finally {
      spy.mockRestore()
    }
  })

  it('should add readGamepad interval when gamepadConnected event fires', () => {
    const spy = vi.spyOn(window, 'addEventListener').mockImplementation((..._args: unknown[]) => undefined)
    try {
      init()
      cast<() => void>(spy.mock.calls[0]?.[1])()
      expect(addIntervalStub.mock.calls.some((c) => c[0] === 'readGamepad')).toBe(true)
    } finally {
      spy.mockRestore()
    }
  })

  it('should readGamepad() when readGamepad interval fires', () => {
    const spy = vi.spyOn(window, 'addEventListener').mockImplementation((..._args: unknown[]) => undefined)
    const readspy = vi.spyOn(Internals, 'readGamepad').mockImplementation((..._args: unknown[]) => undefined)
    try {
      init()
      cast<() => void>(spy.mock.calls[0]?.[1])()
      capturedInterval(addIntervalStub, 'readGamepad')()
      expect(readspy.mock.calls.length > 0).toBe(true)
    } finally {
      readspy.mockRestore()
      spy.mockRestore()
    }
  })
  it('should add gamepaddisconnected event listener to window', () => {
    const spy = vi.spyOn(window, 'addEventListener').mockImplementation((..._args: unknown[]) => undefined)
    try {
      init()
      expect(spy.mock.calls[1]?.[0]).toBe('gamepaddisconnected')
    } finally {
      spy.mockRestore()
    }
  })
  it('should remove readGamepad interval when gamepaddisconnected fires and no gamepads remain', () => {
    const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((..._args: unknown[]) => undefined)
    const existingNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => dom.window.navigator,
    })
    dom.window.navigator.getGamepads = vi.fn().mockReturnValue([null, null])
    try {
      init()
      cast<() => void>(addSpy.mock.calls[0]?.[1])()
      cast<() => void>(addSpy.mock.calls[1]?.[1])()
      expect(removeIntervalStub.mock.calls.some((c) => c[0] === 'readGamepad')).toBe(true)
    } finally {
      Object.defineProperty(global, 'navigator', { configurable: true, get: () => existingNavigator })
      addSpy.mockRestore()
    }
  })
  it('should keep readGamepad interval when gamepaddisconnected fires but other gamepads remain', () => {
    const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((..._args: unknown[]) => undefined)
    const existingNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => dom.window.navigator,
    })
    const fakePad = cast<Gamepad>({ id: 'pad' })
    dom.window.navigator.getGamepads = vi.fn().mockReturnValue([fakePad, null])
    try {
      init()
      cast<() => void>(addSpy.mock.calls[0]?.[1])()
      cast<() => void>(addSpy.mock.calls[1]?.[1])()
      expect(removeIntervalStub.mock.calls.length > 0).toBe(false)
    } finally {
      Object.defineProperty(global, 'navigator', { configurable: true, get: () => existingNavigator })
      addSpy.mockRestore()
    }
  })
})
