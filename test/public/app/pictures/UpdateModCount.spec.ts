'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { Cast } from '../../../testutils/TypeGuards'
import { render } from 'pug'
import Sinon from 'sinon'
import { Net } from '../../../../public/scripts/app/net'
import { Pictures, updateModCount } from '../../../../public/scripts/app/pictures'
import type { Picture } from '../../../../contracts/listing'
import { EventuallyRejects } from '../../../testutils/Errors'

const markup = `html`
describe('public/app/pictures function updateModCount()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>')
  let postJSONSpy = Sinon.stub()
  const testPicture: Picture = {
    name: '',
    path: '',
    seen: false,
  }
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    postJSONSpy = Sinon.stub(Net, 'PostJSON').resolves(100)
    Pictures.current = testPicture
    Pictures.modCount = 0
  })
  afterEach(() => {
    postJSONSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
    Pictures.current = null
    Pictures.modCount = 0
  })
  after(() => {
    Sinon.restore()
  })
  it('should not post when current is null', async () => {
    Pictures.current = null
    await updateModCount()
    expect(postJSONSpy.callCount).to.equal(0)
  })
  it('should resolve false when current is null', async () => {
    Pictures.current = null
    const result = await updateModCount()
    expect(result).to.equal(false)
  })
  it('should post JSON when urrent picture is not null', async () => {
    await updateModCount()
    expect(postJSONSpy.callCount).to.equal(1)
  })
  it('should post to navigate latest to update modcount', async () => {
    await updateModCount()
    expect(postJSONSpy.firstCall.args[0]).to.equal('/api/navigate/latest')
  })
  it('should post expected data to navigate latest', async () => {
    Pictures.modCount = 6969
    testPicture.path = '/foo/bar/baz.png'
    await updateModCount()
    expect(postJSONSpy.firstCall.args[1]).to.deep.equal({ path: '/foo/bar/baz.png', modCount: 6969 })
  })
  const modCounts: Array<[unknown, boolean]> = [
    [0, true],
    [13, true],
    [-100, true],
    [undefined, true],
    [null, false],
    [{}, false],
    ['zero', false],
  ]
  modCounts.forEach(([test, expected]) => {
    it(`should ${expected ? 'accept' : 'reject'} ${JSON.stringify(test)} as modCount`, async () => {
      await updateModCount()
      const fn = Cast<(_: unknown) => boolean>(postJSONSpy.firstCall.args[2])
      expect(fn(test)).to.equal(expected)
    })
  })
  it('should reject when PostJSON rejects', async () => {
    postJSONSpy.rejects('FOO')
    await EventuallyRejects(updateModCount())
  })
  it('should reject with expected error when PostJSON rejects', async () => {
    const err = new Error('foo!')
    postJSONSpy.rejects(err)
    const result = await EventuallyRejects(updateModCount())
    expect(result).to.equal(err)
  })
  it('should reject when PostJSON throws', async () => {
    postJSONSpy.throws('FOO')
    await EventuallyRejects(updateModCount())
  })
  it('should reject with expected error when PostJSON throws', async () => {
    const err = new Error('foo!')
    postJSONSpy.throws(err)
    const result = await EventuallyRejects(updateModCount())
    expect(result).to.equal(err)
  })
})
