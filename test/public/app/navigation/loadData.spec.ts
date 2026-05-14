'use sanity'

import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, Internals, Navigation } from '#public/scripts/app/navigation.js'
import { publishedData, resetPubSub } from '#testutils/pubsub.js'
import { isListing } from '#contracts/listing.js'
import { eventuallyFulfills } from '#testutils/errors.js'
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
const lastOrderForTopic = (stub: MockInstance, topic: string): number => {
  const orders = stub.mock.calls
    .map((c, i) => (c[0] === topic ? (stub.mock.invocationCallOrder[i] ?? -1) : -1))
    .filter((n) => n !== -1)
  return orders.at(-1) ?? -1
}

describe('public/app/navigation loadData()', () => {
  let dom = new JSDOM('', {})
  let publishStub: MockInstance = vi.fn()
  let titleElement: HTMLTitleElement | null = null
  let brandElement: HTMLAnchorElement | null = null
  let getJSONSpy: MockInstance = vi.fn()
  let suppressMenuSpy: MockInstance = vi.fn()
  let historySpy: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    titleElement = dom.window.document.querySelector('head title')
    assert(titleElement !== null)
    brandElement = dom.window.document.querySelector('a.navbar-brand')
    assert(brandElement !== null)
    historySpy = vi.spyOn(dom.window.history, 'pushState').mockImplementation((..._args: unknown[]) => undefined)

    resetPubSub()
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
    getJSONSpy = vi.spyOn(Imports, 'getJSON').mockResolvedValue({
      path: '/foo',
      name: 'foo',
      parent: '/',
    })
    suppressMenuSpy = vi.spyOn(Internals, 'isSuppressMenu').mockReturnValue(false)
  })
  afterAll(() => {
    unmountDom()
    vi.restoreAllMocks()
  })
  it('should publish Loading:show at start of processing', async () => {
    await Internals.loadData()
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:show')).toBe(true)
  })
  it('should call getJSON', async () => {
    await Internals.loadData()
    expect(getJSONSpy.mock.calls.length > 0).toBe(true)
  })
  it('should call getJSON with 2 arguments', async () => {
    await Internals.loadData()
    expect(getJSONSpy.mock.calls[0]).toHaveLength(2)
  })
  it('should call getJSON after Loading:show has been published', async () => {
    await Internals.loadData()
    expect((getJSONSpy.mock.invocationCallOrder.at(-1) ?? -1) > lastOrderForTopic(publishStub, 'Loading:show')).toBe(
      true,
    )
  })
  it('should request data from expected listing path', async () => {
    Navigation.current.path = '/foo/bar/baz/99382111'
    await Internals.loadData()
    expect(getJSONSpy.mock.calls[0]?.[0]).toBe('/api/listing/foo/bar/baz/99382111')
  })
  it('should use isListing contract assertion method to validate getJSON results', async () => {
    await Internals.loadData()
    expect(getJSONSpy.mock.calls[0]?.[1]).toBe(isListing)
  })
  it('should update Navigation.current with results from getJSON call', async () => {
    const data = {
      name: 'Nude in Bar!',
      path: '/N/Nude in Bar',
      parent: '/N',
    }
    getJSONSpy.mockResolvedValue(data)
    await Internals.loadData()
    expect(Navigation.current).toBe(data)
  })
  it('should set noMenu as false when menu is not suppressed', async () => {
    suppressMenuSpy.mockReturnValue(false)
    await Internals.loadData()
    expect(Navigation.current.noMenu).toBe(false)
  })
  it('should set noMenu as true when menu is suppressed', async () => {
    suppressMenuSpy.mockReturnValue(true)
    await Internals.loadData()
    expect(Navigation.current.noMenu).toBe(true)
  })
  it('should set noMenu as true when suppressMenu argument is true', async () => {
    suppressMenuSpy.mockReturnValue(false)
    await Internals.loadData(false, true)
    expect(Navigation.current.noMenu).toBe(true)
  })
  it('should set noMenu as true when suppressMenu argument is true and isSuppressMenu is true', async () => {
    suppressMenuSpy.mockReturnValue(true)
    await Internals.loadData(false, true)
    expect(Navigation.current.noMenu).toBe(true)
  })
  it('should set noMenu as false when suppressMenu argument is false and isSuppressMenu is false', async () => {
    suppressMenuSpy.mockReturnValue(false)
    await Internals.loadData(false, false)
    expect(Navigation.current.noMenu).toBe(false)
  })
  it('should set noMenu as true when suppressMenu argument is false and isSuppressMenu is true', async () => {
    suppressMenuSpy.mockReturnValue(true)
    await Internals.loadData(false, false)
    expect(Navigation.current.noMenu).toBe(true)
  })
  it('should not inherit noMenu from prior Navigation.current state when suppressMenu argument is omitted', async () => {
    suppressMenuSpy.mockReturnValue(false)
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
      noMenu: true,
    }
    await Internals.loadData()
    expect(Navigation.current.noMenu).toBe(false)
  })
  it('should set title element content as retrieved name', async () => {
    getJSONSpy.mockResolvedValue({ name: 'Nude in Bar', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(titleElement?.innerHTML).toBe('Nude in Bar')
  })
  it('should set title element content as retrieved path when name is empty', async () => {
    getJSONSpy.mockResolvedValue({ name: '', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(titleElement?.innerHTML).toBe('/N/Nude in Bar')
  })
  it('should set brand element content as retrieved name', async () => {
    getJSONSpy.mockResolvedValue({ name: 'Nude in Bar', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(brandElement?.innerHTML).toBe('Nude in Bar')
  })
  it('should set brand element content as retrieved path when name is empty', async () => {
    getJSONSpy.mockResolvedValue({ name: '', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(brandElement?.innerHTML).toBe('/N/Nude in Bar')
  })
  it('should tolerate missing title element', async () => {
    titleElement?.parentElement?.removeChild(titleElement)
    await eventuallyFulfills(Internals.loadData())
  })
  it('should tolerate missing brand element', async () => {
    brandElement?.parentElement?.removeChild(brandElement)
    await eventuallyFulfills(Internals.loadData())
  })
  it('should not push state when loading data with no history flag set true', async () => {
    await Internals.loadData(true)
    expect(historySpy.mock.calls.length > 0).toBe(false)
  })
  it('should not push state when loading data with no history flag set false', async () => {
    await Internals.loadData(false)
    expect(historySpy.mock.calls.length > 0).toBe(true)
  })
  it('should not push state when loading data with no history flag unset', async () => {
    await Internals.loadData()
    expect(historySpy.mock.calls.length > 0).toBe(true)
  })
  it('should push history with 3 arguments', async () => {
    getJSONSpy.mockResolvedValue({ name: '', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(historySpy.mock.calls[0]).toHaveLength(3)
  })
  it('should push history with empty state object', async () => {
    getJSONSpy.mockResolvedValue({ name: '', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(historySpy.mock.calls[0]?.[0]).toEqual({})
  })
  it('should push history with empty title', async () => {
    getJSONSpy.mockResolvedValue({ name: '', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(historySpy.mock.calls[0]?.[1]).toBe('')
  })
  it('should push history with URL derived from resolved path', async () => {
    getJSONSpy.mockResolvedValue({ name: '', path: '/N/Nude in Bar' })
    await Internals.loadData()
    expect(historySpy.mock.calls[0]?.[2]).toBe('http://127.0.0.1:2999//N/Nude in Bar')
  })
  it('should push history after retrieving data', async () => {
    await Internals.loadData()
    expect(
      (historySpy.mock.invocationCallOrder.at(-1) ?? -1) > (getJSONSpy.mock.invocationCallOrder.at(-1) ?? -1),
    ).toBe(true)
  })
  it('should publish Loading:Hide after pushing history', async () => {
    await Internals.loadData()
    expect(lastOrderForTopic(publishStub, 'Loading:Hide') > (historySpy.mock.invocationCallOrder.at(-1) ?? -1)).toBe(
      true,
    )
  })
  it('should publish Loading:Hide after retrieving data when not saving history', async () => {
    await Internals.loadData(true)
    expect(lastOrderForTopic(publishStub, 'Loading:Hide') > (getJSONSpy.mock.invocationCallOrder.at(-1) ?? -1)).toBe(
      true,
    )
  })
  it('should publish Navigate:Data after hiding loading screen', async () => {
    await Internals.loadData()
    expect(lastOrderForTopic(publishStub, 'Navigate:Data') > lastOrderForTopic(publishStub, 'Loading:Hide')).toBe(true)
  })
  it('should publish retrieved data as Navigate:Data payload', async () => {
    await Internals.loadData()
    expect(publishedData(publishStub, 'Navigate:Data')).toBe(Navigation.current)
  })
  it('should not publish Loading:Error when no error occurs', async () => {
    await Internals.loadData()
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Error')).toBe(false)
  })
  it('should publish Loading:Error when GetJson rejects', async () => {
    getJSONSpy.mockRejectedValue('FOO')
    await Internals.loadData()
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Error')).toBe(true)
  })
  it('should publish Loading:Error when push history throws', async () => {
    historySpy.mockImplementation(() => {
      throw new Error('FOO')
    })
    await Internals.loadData()
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Error')).toBe(true)
  })
  it('should publish recieved error when GetJson rejects', async () => {
    const err = new Error('FOO')
    getJSONSpy.mockRejectedValue(err)
    await Internals.loadData()
    expect(publishedData(publishStub, 'Loading:Error')).toBe(err)
  })

  const runStaleResponseScenario = async (): Promise<{
    secondData: { name: string; path: string; parent: string }
  }> => {
    const { promise: firstPromise, resolve: resolveFirst } = Promise.withResolvers<unknown>()
    const { promise: secondPromise, resolve: resolveSecond } = Promise.withResolvers<unknown>()
    const secondData = { name: 'second', path: '/second', parent: '/' }
    getJSONSpy.mockReturnValueOnce(firstPromise).mockReturnValueOnce(secondPromise)
    const a = Internals.loadData()
    const b = Internals.loadData()
    resolveSecond(secondData)
    await b
    resolveFirst({ name: 'first', path: '/first', parent: '/' })
    await a
    return { secondData }
  }

  it('should not overwrite Navigation.current with a stale response', async () => {
    const { secondData } = await runStaleResponseScenario()
    expect(Navigation.current).toBe(secondData)
  })

  it('should push history exactly once when a stale response arrives after a newer one', async () => {
    await runStaleResponseScenario()
    expect(historySpy.mock.calls.length).toBe(1)
  })

  it('should publish Navigate:Data exactly once when a stale response arrives after a newer one', async () => {
    await runStaleResponseScenario()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Navigate:Data').length).toBe(1)
  })

  it('should not publish Loading:Error for a stale rejection', async () => {
    const { promise: firstPromise, reject: rejectFirst } = Promise.withResolvers<unknown>()
    const { promise: secondPromise, resolve: resolveSecond } = Promise.withResolvers<unknown>()
    getJSONSpy.mockReturnValueOnce(firstPromise).mockReturnValueOnce(secondPromise)
    const a = Internals.loadData()
    const b = Internals.loadData()
    resolveSecond({ name: 'second', path: '/second', parent: '/' })
    await b
    rejectFirst(new Error('stale'))
    await a
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Error')).toBe(false)
  })
})
