'use sanity'

import type { Picture } from '#contracts/listing.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { changePicture, Imports, Internals, Viewer } from '#public/scripts/app/pictureNavigation.js'
import { publishedData } from '#testutils/pubsub.js'
import type { MockInstance } from 'vitest'

const HISTORY_SIZE = 10

describe('public/app/pictures changePicture()', () => {
  let publishStub: MockInstance = vi.fn()
  let isLoadingSpy: MockInstance = vi.fn()
  let loadImageSpy: MockInstance = vi.fn()
  beforeEach(() => {
    Pictures.current = null
    Viewer.history = { prev: [], next: [] }
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    isLoadingSpy = vi.spyOn(Imports, 'isLoading').mockReturnValue(false)
    loadImageSpy = vi.spyOn(Internals, 'loadImage').mockResolvedValue(undefined)
  })
  it('should not set current picture if image is currently loading', async () => {
    isLoadingSpy.mockReturnValue(true)
    await changePicture({ name: '', path: '', seen: false })
    expect(Pictures.current).toBe(null)
  })
  it('should not load image if image is currently loading', async () => {
    isLoadingSpy.mockReturnValue(true)
    await changePicture({ name: '', path: '', seen: false })
    expect(loadImageSpy.mock.calls.length).toBe(0)
  })
  it('should not hide menu if image is currently loading', async () => {
    isLoadingSpy.mockReturnValue(true)
    await changePicture({ name: '', path: '', seen: false })
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(0)
  })
  it('should not publish error if image is currently loading', async () => {
    isLoadingSpy.mockReturnValue(true)
    await changePicture(undefined)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:Error').length).toBe(0)
  })
  it('should not set current image when changing to empty picture', async () => {
    const pic = { name: '', path: '', seen: true }
    Pictures.current = pic
    await changePicture(undefined)
    expect(Pictures.current).toBe(pic)
  })
  it('should not load image when changing to empty picture', async () => {
    await changePicture(undefined)
    expect(loadImageSpy.mock.calls.length).toBe(0)
  })
  it('should not hide menu when changing to empty picture', async () => {
    await changePicture(undefined)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(0)
  })
  it('should publish error when changing to empty picture', async () => {
    await changePicture(undefined)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:Error').length).toBe(1)
  })
  it('should publish specific error message when changing to empty picture', async () => {
    await changePicture(undefined)
    expect(publishedData(publishStub, 'Loading:Error')).toBe('Change Picture called with No Picture to change to')
  })
  it('should set current image when changing to valid picture', async () => {
    const pic = { name: '', path: '', seen: true }
    await changePicture(pic)
    expect(Pictures.current).toBe(pic)
  })
  it('should hide menu when changing to valid picture', async () => {
    const pic = { name: '', path: '', seen: true }
    await changePicture(pic)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
  })
  it('should tolerate loadImage rejecting', async () => {
    const pic = { name: '', path: '', seen: true }
    loadImageSpy.mockRejectedValue('FOO!')
    await changePicture(pic)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
  })
  it('should load image when changing to valid picture', async () => {
    const pic = { name: '', path: '', seen: true }
    await changePicture(pic)
    expect(loadImageSpy.mock.calls.length).toBe(1)
  })
  it('should not publish error when changing to valid picture', async () => {
    const pic = { name: '', path: '', seen: true }
    await changePicture(pic)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Loading:Error').length).toBe(0)
  })
  it('should push prior current onto history.prev', async () => {
    const prior: Picture = { name: 'prior', path: '/prior', seen: true }
    Pictures.current = prior
    await changePicture({ name: 'next', path: '/next', seen: false })
    expect(Viewer.history.prev).toEqual([prior])
  })
  it('should not push to history.prev when prior current is null', async () => {
    Pictures.current = null
    await changePicture({ name: 'next', path: '/next', seen: false })
    expect(Viewer.history.prev).toEqual([])
  })
  it('should truncate history.next on fresh view', async () => {
    Pictures.current = { name: 'cur', path: '/cur', seen: true }
    Viewer.history.next = [{ name: 'redo', path: '/redo', seen: true }]
    await changePicture({ name: 'next', path: '/next', seen: false })
    expect(Viewer.history.next).toEqual([])
  })
  it('should cap history.prev at HISTORY_SIZE by dropping the oldest entry', async () => {
    const filler = (i: number): Picture => ({ name: `f${i}`, path: `/f${i}`, seen: true })
    Pictures.current = { name: 'tail', path: '/tail', seen: true }
    Viewer.history.prev = Array.from({ length: HISTORY_SIZE }, (_, i) => filler(i))
    await changePicture({ name: 'next', path: '/next', seen: false })
    expect(Viewer.history.prev).toHaveLength(HISTORY_SIZE)
  })
  it('should drop the oldest history.prev entry first when over cap', async () => {
    const filler = (i: number): Picture => ({ name: `f${i}`, path: `/f${i}`, seen: true })
    Pictures.current = { name: 'tail', path: '/tail', seen: true }
    Viewer.history.prev = Array.from({ length: HISTORY_SIZE }, (_, i) => filler(i))
    await changePicture({ name: 'next', path: '/next', seen: false })
    expect(Viewer.history.prev[0]?.name).toBe('f1')
  })
  it('should not record history when isLoading guard fires', async () => {
    isLoadingSpy.mockReturnValue(true)
    Pictures.current = { name: 'prior', path: '/prior', seen: true }
    await changePicture({ name: 'next', path: '/next', seen: false })
    expect(Viewer.history.prev).toEqual([])
  })
  it('should not record history when given undefined pic', async () => {
    Pictures.current = { name: 'prior', path: '/prior', seen: true }
    await changePicture(undefined)
    expect(Viewer.history.prev).toEqual([])
  })
})
