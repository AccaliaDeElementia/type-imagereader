'use sanity'

import { expect } from 'chai'
import { Functions } from '#utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function HealBrokenFolderMetadata()', () => {
  let loggerStub = Sinon.stub()
  let loggerFake = Cast<Debugger>(loggerStub)
  let rawStub = Sinon.stub().resolves({ rowCount: 0 })
  let extractInsertCountStub = Sinon.stub().returns(0)
  let knexFnFake = StubToKnex({ raw: rawStub })

  beforeEach(() => {
    loggerStub = Sinon.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    rawStub = Sinon.stub().resolves({ rowCount: 0 })
    extractInsertCountStub = sandbox.stub(Functions, 'ExtractInsertCount').returns(0)
    knexFnFake = StubToKnex({ raw: rawStub })
  })
  afterEach(() => {
    sandbox.restore()
  })

  it('should call knex.raw exactly once', async () => {
    await Functions.HealBrokenFolderMetadata(loggerFake, knexFnFake)
    expect(rawStub.callCount).to.equal(1)
  })
  it('should execute the documented heal statement', async () => {
    await Functions.HealBrokenFolderMetadata(loggerFake, knexFnFake)
    expect(rawStub.firstCall.args[0]).to.equal(Functions.HealBrokenFolderMetadataSql)
  })
  it('should target the folders table', async () => {
    await Functions.HealBrokenFolderMetadata(loggerFake, knexFnFake)
    expect(Functions.HealBrokenFolderMetadataSql).to.match(/^UPDATE folders\b/v)
  })
  it('should source metadata from the syncitems table', async () => {
    await Functions.HealBrokenFolderMetadata(loggerFake, knexFnFake)
    expect(Functions.HealBrokenFolderMetadataSql).to.match(/\bFROM syncitems\b/v)
  })
  it('should restrict syncitems rows to directories (isFile = false)', async () => {
    await Functions.HealBrokenFolderMetadata(loggerFake, knexFnFake)
    expect(Functions.HealBrokenFolderMetadataSql).to.match(/syncitems\."isFile" = false/v)
  })
  it('should only update rows with a null folder or sortKey', async () => {
    await Functions.HealBrokenFolderMetadata(loggerFake, knexFnFake)
    expect(Functions.HealBrokenFolderMetadataSql).to.match(/folders\.folder IS NULL OR folders\."sortKey" IS NULL/v)
  })
  it('should extract the updated row count from the raw result', async () => {
    const rawResult = { rowCount: 42 }
    rawStub.resolves(rawResult)
    await Functions.HealBrokenFolderMetadata(loggerFake, knexFnFake)
    expect(extractInsertCountStub.firstCall.args[0]).to.equal(rawResult)
  })
  it('should log the number of folders healed', async () => {
    extractInsertCountStub.returns(42)
    await Functions.HealBrokenFolderMetadata(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Healed 42 folders with missing metadata')
  })
  it('should log zero healed when nothing needed healing', async () => {
    extractInsertCountStub.returns(0)
    await Functions.HealBrokenFolderMetadata(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Healed 0 folders with missing metadata')
  })
})
