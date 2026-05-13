'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { makeTab, Internals, PICTURES_PER_PAGE } from '#public/scripts/app/pictureMarkup.js'
import { render } from 'pug'
import type { Picture } from '#contracts/listing.js'
import { resetPubSub } from '#testutils/pubsub.js'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    div#tabImages
`

describe('public/app/pictures makeTab()', () => {
  let dom = new JSDOM('<html></html>', {})
  let makePicturesPageSpy: MockInstance = vi.fn()
  let makePaginatorSpy: MockInstance = vi.fn()
  let tab: HTMLElement | null = null
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    makePicturesPageSpy = vi
      .spyOn(Internals, 'makePicturesPage')
      .mockImplementation((pagenum: number, _: Picture[]) => {
        const retval = dom.window.document.createElement('div')
        retval.classList.add('page')
        retval.classList.add(`data-page-${pagenum}`)
        return retval
      })
    makePaginatorSpy = vi.spyOn(Internals, 'makePaginator').mockImplementation(() => {
      const retval = dom.window.document.createElement('div')
      retval.classList.add('paginator')
      return retval
    })
    Pictures.pictures = Array.from({ length: PICTURES_PER_PAGE }).map(
      (_: unknown, i: number): Picture => ({
        path: `/some/path/${i}.png`,
        name: `${i}.png`,
        seen: false,
      }),
    )
    resetPubSub()
    tab = dom.window.document.querySelector('#tabImages')
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should call makePicturesPage with page 1', () => {
    makeTab()
    expect(makePicturesPageSpy).toHaveBeenCalledWith(1, expect.anything())
  })
  it('should add provided page to pictures tab', () => {
    makeTab()
    expect(tab?.querySelector('.page')).toBeInstanceOf(dom.window.HTMLElement)
  })
  it('should call makePicturesPage once per page', () => {
    Pictures.pictures = Array.from({ length: PICTURES_PER_PAGE * 4 }).map(
      (_: unknown, i: number): Picture => ({ path: `/p/${i}`, name: `${i}`, seen: false }),
    )
    makeTab()
    expect(makePicturesPageSpy.mock.calls.length).toBe(4)
  })
  it('should make pages according to PICTURES_PER_PAGE', () => {
    Pictures.pictures = Array.from({ length: PICTURES_PER_PAGE * 4 }).map(
      (_: unknown, i: number): Picture => ({ path: `/p/${i}`, name: `${i}`, seen: false }),
    )
    makeTab()
    expect(tab?.querySelectorAll('.page')).toHaveLength(4)
  })
  it('should round up partial trailing pages', () => {
    Pictures.pictures = Array.from({ length: PICTURES_PER_PAGE * 3 + 1 }).map(
      (_: unknown, i: number): Picture => ({ path: `/p/${i}`, name: `${i}`, seen: false }),
    )
    makeTab()
    expect(makePicturesPageSpy.mock.calls.length).toBe(4)
  })
  it('should make pages with image subsets for each page', () => {
    Pictures.pictures = Array.from({ length: PICTURES_PER_PAGE * 4 }).map(
      (_: unknown, i: number): Picture => ({ path: `/p/${i}`, name: `${i}`, seen: false }),
    )
    makeTab()
    for (let i = 0; i < 4; i += 1) {
      const call = makePicturesPageSpy.mock.calls[i]
      expect(call).toHaveLength(2)
      expect(call?.[0]).toBe(i + 1)
      expect(call?.[1]).toEqual(Pictures.pictures.slice(i * PICTURES_PER_PAGE, (i + 1) * PICTURES_PER_PAGE))
    }
  })
  it('should call makePaginator once', () => {
    makeTab()
    expect(makePaginatorSpy.mock.calls.length).toBe(1)
  })
  it('should make paginator', () => {
    makeTab()
    expect(tab?.querySelector('.paginator')).toBeInstanceOf(dom.window.HTMLElement)
  })
  it('should make paginator for calculated page count', () => {
    Pictures.pictures = Array.from({ length: PICTURES_PER_PAGE * 8 }).map(
      (_: unknown, i: number): Picture => ({ path: `/p/${i}`, name: `${i}`, seen: false }),
    )
    makeTab()
    expect(makePaginatorSpy.mock.calls[0]).toEqual([8])
  })
  it('should add paginator to tab for calculated page count', () => {
    Pictures.pictures = Array.from({ length: PICTURES_PER_PAGE * 8 }).map(
      (_: unknown, i: number): Picture => ({ path: `/p/${i}`, name: `${i}`, seen: false }),
    )
    makeTab()
    expect(tab?.querySelector('.paginator')).toBeInstanceOf(dom.window.HTMLElement)
  })
  it('should still call makePaginator when it returns null', () => {
    makePaginatorSpy.mockReturnValue(null)
    makeTab()
    expect(makePaginatorSpy.mock.calls.length).toBe(1)
  })
  it('should omit paginator when makePaginator returns null', () => {
    makePaginatorSpy.mockReturnValue(null)
    makeTab()
    expect(tab?.querySelector('.paginator')).toBe(null)
  })
})
