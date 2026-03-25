'use sanity'

import { expect } from 'chai'
import { Functions, type SiblingFolderSearch } from '../../../routes/apiFunctions'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../../testutils/TypeGuards'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('routes/apiFunctions function GetPreviousFolder', () => {
  let knexFake = StubToKnex({ Knex: Math.random() })
  let getDirectionFolderStub = Sinon.stub()

  beforeEach(() => {
    knexFake = StubToKnex({ Knex: Math.random() })
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
  it('should call pass path parameter to do actual query', async () => {
    await Functions.GetPreviousFolder(knexFake, '/foo', 'foo')
    const param = Cast<SiblingFolderSearch | undefined>(getDirectionFolderStub.firstCall.args[1])
    assert(param !== undefined)
    expect(param.path).to.equal('/foo')
  })
  it('should call pass sortkey parameter to do actual query', async () => {
    await Functions.GetPreviousFolder(knexFake, '/foo', 'foo90210')
    const param = Cast<SiblingFolderSearch | undefined>(getDirectionFolderStub.firstCall.args[1])
    assert(param !== undefined)
    expect(param.sortKey).to.equal('foo90210')
  })
  it('should call pass desc as direction parameter to do actual query', async () => {
    await Functions.GetPreviousFolder(knexFake, '/foo', 'foo')
    const param = Cast<SiblingFolderSearch | undefined>(getDirectionFolderStub.firstCall.args[1])
    assert(param !== undefined)
    expect(param.direction).to.equal('desc')
  })
  it('should call pass all as type parameter to do actual query', async () => {
    await Functions.GetPreviousFolder(knexFake, '/foo', 'foo')
    const param = Cast<SiblingFolderSearch | undefined>(getDirectionFolderStub.firstCall.args[1])
    assert(param !== undefined)
    expect(param.type).to.equal('all')
  })
  it('should resolve as result of actual query', async () => {
    const data = { data: Math.random() }
    getDirectionFolderStub.resolves(data)
    const result = await Functions.GetPreviousFolder(knexFake, '/foo', 'foo')
    expect(result).to.equal(data)
  })
})
