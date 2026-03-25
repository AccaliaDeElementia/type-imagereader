'use sanity'

import { expect } from 'chai'
import { Functions, type SiblingFolderSearch } from '../../../routes/apiFunctions'
import Sinon from 'sinon'
import { Cast } from '../../../testutils/TypeGuards'
import { createKnexChainFake } from '../../../testutils/Knex'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('routes/apiFunctions function GetPreviousFolder', () => {
  let { fake: knexFake } = createKnexChainFake([] as const, [] as const)
  let getDirectionFolderStub = Sinon.stub()

  beforeEach(() => {
    ;({ fake: knexFake } = createKnexChainFake([] as const, [] as const))
    getDirectionFolderStub = sandbox.stub(Functions, 'GetDirectionFolder').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call GetDirectionFolder to do actual query', async () => {
    await Functions.GetPreviousFolder(knexFake, '/foo', 'foo')
    expect(getDirectionFolderStub.callCount).to.equal(1)
  })
  it('should call pass knex parameter to do actual query', async () => {
    await Functions.GetPreviousFolder(knexFake, '/foo', 'foo')
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
      await Functions.GetPreviousFolder(knexFake, '/foo', sortKey)
      const param = Cast<SiblingFolderSearch | undefined>(getDirectionFolderStub.firstCall.args[1])
      assert(param !== undefined)
      expect(param[prop]).to.equal(expected)
    })
  })
  it('should resolve as result of actual query', async () => {
    const data = { data: Math.random() }
    getDirectionFolderStub.resolves(data)
    const result = await Functions.GetPreviousFolder(knexFake, '/foo', 'foo')
    expect(result).to.equal(data)
  })
})
