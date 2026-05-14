'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, init, Internals, Navigation } from '#public/scripts/app/navigation.js'
import { resetPubSub } from '#testutils/pubsub.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

const markup = `
html
  head
    title
  body
    div
      a.navbar-brand
      a.menuButton
    div#mainMenu
      div.innerTarget
`
describe('public/app/navigation init()', () => {
  let dom = new JSDOM('', {})
  let loadDataStub: MockInstance = vi.fn()
  let subscribeStub: MockInstance = vi.fn()
  let forwardStub: MockInstance = vi.fn()
  const allRegisteredTopics = (): string[] => [
    ...subscribeStub.mock.calls.map((c) => cast<string>(c[0])),
    ...forwardStub.mock.calls.map((c) => cast<string>(c[0])),
  ]
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    resetPubSub()
    loadDataStub = vi.spyOn(Internals, 'loadData').mockResolvedValue(undefined)
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
    forwardStub = vi.spyOn(Imports, 'forward').mockImplementation((..._args: unknown[]) => undefined)
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
  })
  afterAll(() => {
    unmountDom()
    vi.restoreAllMocks()
  })
  it('should set path of current data on init', () => {
    dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz',
    })
    init()
    expect(Navigation.current.path).toBe('/foo/bar/baz')
  })
  it('should execute loadData once with defaults', () => {
    init()
    expect(loadDataStub.mock.calls.length).toBe(1)
  })
  it('should execute loadData with no arguments', () => {
    init()
    expect(loadDataStub.mock.calls[0]).toEqual([])
  })
  it('should tolerate loadData rejecting', async () => {
    loadDataStub.mockRejectedValue('FOO!')
    init()
    await Promise.resolve()
    expect(loadDataStub.mock.calls.length).toBe(1)
  })
  const subscribers = [
    'Navigate:Data',
    'Navigate:Load',
    'Navigate:Reload',
    'Menu:show',
    'Menu:Hide',
    'Action:Execute:PreviousFolder',
    'Action:Execute:NextFolder',
    'Action:Execute:ParentFolder',
    'Action:Execute:FirstUnfinished',
    'Action:Execute:ShowMenu',
    'Action:Execute:HideMenu',
    'Action:Execute:MarkAllSeen',
    'Action:Execute:MarkAllUnseen',
    'Action:Execute:Slideshow',
    'Action:Execute:FullScreen',
    'Action:Keypress:<Ctrl>ArrowUp',
    'Action:Keypress:<Ctrl>ArrowDown',
    'Action:Keypress:<Ctrl>ArrowLeft',
    'Action:Keypress:<Ctrl>ArrowRight',
    'Action:Gamepad:Down',
    'Action:Gamepad:Up',
    'Action:Gamepad:North',
    'Action:Gamepad:East',
  ]
  describe('subscriber list after init', () => {
    const subs = subscribers.map((s) => s.toUpperCase())
    beforeEach(() => {
      init()
    })
    it('should contain all expected subscribers', () => {
      expect(
        allRegisteredTopics()
          .map((s) => s.toUpperCase())
          .sort(),
      ).toEqual([...subs].sort())
    })
    it('should contain no unexpected subscribers', () => {
      expect(allRegisteredTopics()).toHaveLength(subs.length)
    })
  })
  subscribers.forEach((subscriber) => {
    const doInit = (): void => {
      init()
    }
    it(`should subscribe to ${subscriber}`, () => {
      doInit()
      expect(allRegisteredTopics().map((s) => s.toUpperCase())).toContain(subscriber.toUpperCase())
    })
    it(`should subscribe to ${subscriber} exactly once`, () => {
      doInit()
      const matches = allRegisteredTopics().filter((t) => t.toUpperCase() === subscriber.toUpperCase())
      expect(matches).toHaveLength(1)
    })
  })
})
