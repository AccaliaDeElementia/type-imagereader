'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { PubSub } from '#public/scripts/app/pubsub.js'
import { Actions, Init, Internals } from '#public/scripts/app/actions.js'

import { Cast } from '#testutils/TypeGuards.js'
import { getSubscriber, resetPubSub } from '#testutils/PubSub.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import type { Listing } from '#contracts/listing.js'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('public/app/actions function Init()', () => {
  const dom: JSDOM = new JSDOM('', {})
  let BuildActionsSpy = sandbox.stub()
  let GamepadResetSpy = sandbox.stub()

  beforeEach(() => {
    mountDom(dom)
    resetPubSub()
    BuildActionsSpy = sandbox.stub(Internals, 'BuildActions')
    GamepadResetSpy = sandbox.stub(Actions.gamepads, 'Reset')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should build actions on init', () => {
    Init()
    expect(BuildActionsSpy.called).to.equal(true)
  })
  it('should reset gamepads on init', () => {
    Init()
    expect(GamepadResetSpy.called).to.equal(true)
  })
  it('should subscribe to Navigate:Data', () => {
    Init()
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.have.length(1)
  })
  const navigateDataTestCases: Array<[string, Listing, boolean]> = [
    ['null', Cast<Listing>(null), false],
    ['undefined', Cast<Listing>(undefined), false],
    ['boolean', Cast<Listing>(false), false],
    ['number', Cast<Listing>(1701), false],
    ['string', Cast<Listing>('Enterprise'), false],
    ['array', Cast<Listing>([null]), false],
    ['empty object', Cast<Listing>({}), false],
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
      Init()
      const handler = getSubscriber('NAVIGATE:DATA')
      const spy = sandbox.stub().resolves()
      PubSub.subscribers['TAB:SELECT'] = [spy]
      await handler(listing)
      return spy
    }
    it(`should ${expected ? '' : 'not '}publish Tab:Select for ${title} listing on navigate`, async () => {
      const spy = await doNavigate()
      expect(spy.called).to.equal(expected)
    })
    if (expected) {
      it(`should publish Tab:Select with expected args for ${title} listing on navigate`, async () => {
        const spy = await doNavigate()
        expect(spy.firstCall.args).to.deep.equal(['Actions', 'TAB:SELECT'])
      })
    }
  })
  it('should add exactly one keyup event listener to document', () => {
    const spy = sandbox.stub(document, 'addEventListener')
    try {
      Init()
      expect(spy.callCount).to.equal(1)
    } finally {
      spy.restore()
    }
  })
  it('should add keyup event listener to document', () => {
    const spy = sandbox.stub(document, 'addEventListener')
    try {
      Init()
      expect(spy.firstCall.calledWith('keyup')).to.equal(true)
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
        handler = Cast<(o: unknown) => void>(h)
      })
      try {
        Init()
        handler(event)
      } finally {
        documentSpy.restore()
      }
      return spy
    }
    it(`should publish ${expected} keypress event once`, () => {
      expect(doKeypress().callCount).to.equal(1)
    })
    it(`should publish ${expected} keypress event with expected args`, () => {
      expect(doKeypress().firstCall.args).to.deep.equal([expected, `ACTION:KEYPRESS:${expected}`])
    })
  })

  it('should add exactly two event listeners to window', () => {
    const spy = sandbox.stub(window, 'addEventListener')
    try {
      Init()
      expect(spy.callCount).to.equal(2)
    } finally {
      spy.restore()
    }
  })
  it('should add gamepadconnected event listener to window', () => {
    const spy = sandbox.stub(window, 'addEventListener')
    try {
      Init()
      expect(spy.firstCall.calledWith('gamepadconnected')).to.equal(true)
    } finally {
      spy.restore()
    }
  })

  it('should add ReadGamepad interval when gamepadConnected event fires', () => {
    const spy = sandbox.stub(window, 'addEventListener')
    try {
      Init()
      Cast<() => void>(spy.firstCall.args[1])()
      expect(PubSub.intervals.ReadGamepad).to.not.equal(undefined)
    } finally {
      spy.restore()
    }
  })

  it('should ReadGamepad() when ReadGamepad interval fires', () => {
    const spy = sandbox.stub(window, 'addEventListener')
    const readspy = sandbox.stub(Internals, 'ReadGamepad')
    try {
      Init()
      Cast<() => void>(spy.firstCall.args[1])()
      assert(PubSub.intervals.ReadGamepad !== undefined)
      PubSub.intervals.ReadGamepad.method()
      expect(readspy.called).to.equal(true)
    } finally {
      readspy.restore()
      spy.restore()
    }
  })
  it('should add gamepaddisconnected event listener to window', () => {
    const spy = sandbox.stub(window, 'addEventListener')
    try {
      Init()
      expect(spy.secondCall.calledWith('gamepaddisconnected')).to.equal(true)
    } finally {
      spy.restore()
    }
  })
  it('should remove ReadGamepad interval when gamepaddisconnected fires and no gamepads remain', () => {
    const addSpy = sandbox.stub(window, 'addEventListener')
    const existingNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => dom.window.navigator,
    })
    dom.window.navigator.getGamepads = sandbox.stub().returns([null, null])
    try {
      Init()
      Cast<() => void>(addSpy.firstCall.args[1])()
      assert(PubSub.intervals.ReadGamepad !== undefined)
      Cast<() => void>(addSpy.secondCall.args[1])()
      expect(PubSub.intervals.ReadGamepad).to.equal(undefined)
    } finally {
      Object.defineProperty(global, 'navigator', { configurable: true, get: () => existingNavigator })
      addSpy.restore()
    }
  })
  it('should keep ReadGamepad interval when gamepaddisconnected fires but other gamepads remain', () => {
    const addSpy = sandbox.stub(window, 'addEventListener')
    const existingNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => dom.window.navigator,
    })
    const fakePad = Cast<Gamepad>({ id: 'pad' })
    dom.window.navigator.getGamepads = sandbox.stub().returns([fakePad, null])
    try {
      Init()
      Cast<() => void>(addSpy.firstCall.args[1])()
      assert(PubSub.intervals.ReadGamepad !== undefined)
      Cast<() => void>(addSpy.secondCall.args[1])()
      expect(PubSub.intervals.ReadGamepad).to.not.equal(undefined)
    } finally {
      Object.defineProperty(global, 'navigator', { configurable: true, get: () => existingNavigator })
      addSpy.restore()
    }
  })
})
