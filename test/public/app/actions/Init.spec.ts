'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, after, describe, it } from 'mocha'
import Sinon from 'sinon'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Actions } from '../../../../public/scripts/app/actions'

import { Cast } from '../../../testutils/TypeGuards'
import { JSDOM } from 'jsdom'
import type { Listing } from '../../../../contracts/listing'
import assert from 'assert'

describe('public/app/actions function Init()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  const dom: JSDOM = new JSDOM('', {})
  let BuildActionsSpy = Sinon.stub()
  let GamepadResetSpy = Sinon.stub()

  beforeEach(() => {
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    PubSub.subscribers = {}
    PubSub.deferred = []
    PubSub.intervals = {}
    BuildActionsSpy = Sinon.stub(Actions, 'BuildActions')
    GamepadResetSpy = Sinon.stub(Actions.gamepads, 'Reset')
  })
  afterEach(() => {
    GamepadResetSpy.restore()
    BuildActionsSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should build actions on init', () => {
    Actions.Init()
    expect(BuildActionsSpy.called).to.equal(true)
  })
  it('should reset gamepads on init', () => {
    Actions.Init()
    expect(GamepadResetSpy.called).to.equal(true)
  })
  it('should subscribe to Navigate:Data', () => {
    Actions.Init()
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
        children: [{ name: '', path: '', cover: null, totalCount: 10, totalSeen: 0 }],
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
        children: [{ name: '', path: '', cover: null, totalCount: 10, totalSeen: 0 }],
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
    it(`should ${expected ? '' : 'not '}publish Tab:Select for ${title} listing on navigate`, async () => {
      Actions.Init()
      const handler = PubSub.subscribers['NAVIGATE:DATA']?.pop()
      assert(handler !== undefined, 'Navigate:Data handler must be defined')
      const spy = Sinon.stub().resolves()
      PubSub.subscribers['TAB:SELECT'] = [spy]
      await handler(listing)
      expect(spy.called).to.equal(expected)
      if (expected) {
        expect(spy.firstCall.args).to.deep.equal(['Actions', 'TAB:SELECT'])
      }
    })
  })
  it('should add keyup event listener to document', () => {
    const spy = Sinon.stub(document, 'addEventListener')
    try {
      Actions.Init()
      expect(spy.callCount).to.equal(1)
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
    it(`should prossess ${expected} keypress`, () => {
      const documentSpy = Sinon.stub(document, 'addEventListener')
      let handler: (o: unknown) => void = (_) => {
        expect.fail('Base Function should not be called!')
      }
      documentSpy.callsFake((_, h) => {
        handler = Cast<(o: unknown) => void>(h)
      })
      const spy = Sinon.stub().resolves()
      PubSub.subscribers['ACTION:KEYPRESS'] = [spy]
      try {
        Actions.Init()
        handler(event)
        expect(spy.callCount).to.equal(1)
        expect(spy.firstCall.args).to.deep.equal([expected, `ACTION:KEYPRESS:${expected}`])
      } finally {
        documentSpy.restore()
      }
    })
  })

  it('should add gamepadconnected event listener to window', () => {
    const spy = Sinon.stub(window, 'addEventListener')
    try {
      Actions.Init()
      expect(spy.callCount).to.equal(1)
      expect(spy.firstCall.calledWith('gamepadconnected')).to.equal(true)
    } finally {
      spy.restore()
    }
  })

  it('should add ReadGamepad interval when gamepadConnected event fires', () => {
    const spy = Sinon.stub(window, 'addEventListener')
    try {
      Actions.Init()
      expect(PubSub.intervals.ReadGamepad).to.equal(undefined)
      Cast<() => void>(spy.firstCall.args[1])()
      expect(PubSub.intervals.ReadGamepad).to.not.equal(undefined)
    } finally {
      spy.restore()
    }
  })

  it('should ReadGamepad() when ReadGamepad interval fires', () => {
    const spy = Sinon.stub(window, 'addEventListener')
    const readspy = Sinon.stub(Actions, 'ReadGamepad')
    try {
      Actions.Init()
      expect(PubSub.intervals.ReadGamepad).to.equal(undefined)
      Cast<() => void>(spy.firstCall.args[1])()
      assert(PubSub.intervals.ReadGamepad !== undefined)
      expect(readspy.called).to.equal(false)
      PubSub.intervals.ReadGamepad.method()
      expect(readspy.called).to.equal(true)
    } finally {
      readspy.restore()
      spy.restore()
    }
  })
})
