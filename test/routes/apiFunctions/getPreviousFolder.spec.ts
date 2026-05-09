'use sanity'

import { expect } from 'chai'
import { getPreviousFolder, Internals, type SiblingFolderSearch } from '#routes/apiFunctions.js'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'
import { createKnexChainFake } from '#testutils/knex.js'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('routes/apiFunctions getPreviousFolder', () => {
  let { fake: knexFake } = createKnexChainFake([] as const, [] as const)
  let getDirectionFolderStub = sandbox.stub()

  beforeEach(() => {
    ;({ fake: knexFake } = createKnexChainFake([] as const, [] as const))
    getDirectionFolderStub = sandbox.stub(Internals, 'getDirectionFolder').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call getDirectionFolder to do actual query', async () => {
    await getPreviousFolder(knexFake, '/foo', 'foo')
    expect(getDirectionFolderStub.callCount).to.equal(1)
  })
  it('should call pass knex parameter to do actual query', async () => {
    await getPreviousFolder(knexFake, '/foo', 'foo')
    expect(getDirectionFolderStub.firstCall.args[0]).to.equal(knexFake)
  })
  const paramTests: Array<[string, string, keyof SiblingFolderSearch, string]> = [
    ['path parameter', '/foo', 'path', '/foo'],
    ['sortkey parameter', 'foo90210', 'sortKey', 'foo90210'],
    ['direction parameter', 'foo', 'direction', 'desc'],
    ['type parameter', 'foo', 'type', 'all'],
  ]
  paramTests.forEach(([title, sortKey, prop, expected]) => {
    it(`should call pass ${title} to do actual query`, async () => {
      await getPreviousFolder(knexFake, '/foo', sortKey)
      const param = cast<SiblingFolderSearch | undefined>(getDirectionFolderStub.firstCall.args[1])
      assert(param !== undefined)
      expect(param[prop]).to.equal(expected)
    })
  })
  it('should resolve as result of actual query', async () => {
    const data = { data: Math.random() }
    getDirectionFolderStub.resolves(data)
    const result = await getPreviousFolder(knexFake, '/foo', 'foo')
    expect(result).to.equal(data)
  })
})
