'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { Imports, Internals, refreshImage } from '#public/scripts/app/pictureNavigation.js'
import { render } from 'pug'
import type { Picture } from '#contracts/listing.js'
import { resetPubSub } from '#testutils/pubsub.js'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    div#tabImages
`

describe('public/app/pictures refreshImage()', () => {
  let dom = new JSDOM('<html></html>', {})
  const current: Picture = {
    name: '1250.png',
    path: '/some/path/1250.png',
    seen: true,
  }
  let makeURIStub: MockInstance = vi.fn()
  let loadNextImageStub: MockInstance = vi.fn()
  let publishStub: MockInstance = vi.fn()
  let postJSONStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
    resetPubSub()
    Pictures.current = { ...current }
    Pictures.mainImage = dom.window.document.createElement('img')
    makeURIStub = vi.spyOn(Internals, 'makeURI').mockReturnValue('/images/original/some/path/1250.png-image.webp')
    loadNextImageStub = vi.spyOn(Internals, 'loadNextImage').mockResolvedValue(undefined)
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    postJSONStub = vi.spyOn(Imports, 'postJSON').mockResolvedValue(50)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should be noop when current image is null', async () => {
    Pictures.current = null
    await refreshImage()
    expect(makeURIStub.mock.calls.length).toBe(0)
  })
  it('should be noop when current image has no path', async () => {
    Pictures.current = { ...current, path: '' }
    await refreshImage()
    expect(makeURIStub.mock.calls.length).toBe(0)
  })
  it('should show the loading overlay while refetching', async () => {
    await refreshImage()
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:show').length).toBe(1)
  })
  it('should build a URI for the current picture', async () => {
    await refreshImage()
    expect(makeURIStub.mock.calls[0]).toEqual([Pictures.current])
  })
  it('should set the rebuilt URI as the image source', async () => {
    await refreshImage()
    expect(Pictures.mainImage?.getAttribute('src')).toBe('/images/original/some/path/1250.png-image.webp')
  })
  // The prefetched next image was fetched at the previous size, so it has to be
  // primed again for the newly selected one.
  it('should prime the next image prefetch again', async () => {
    await refreshImage()
    expect(loadNextImageStub.mock.calls.length).toBe(1)
  })
  it('should tolerate a failing prefetch', async () => {
    loadNextImageStub.mockRejectedValue(new Error('OOPS'))
    await expect(refreshImage()).resolves.toBeUndefined()
  })
  // A refresh re-renders what is already on screen; it must not re-report the
  // picture as freshly viewed.
  it('should not report the picture as newly viewed', async () => {
    await refreshImage()
    expect(postJSONStub.mock.calls.length).toBe(0)
  })
})
