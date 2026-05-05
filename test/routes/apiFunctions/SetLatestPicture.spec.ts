'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#routes/apiFunctions.js'
import { StubToKnex } from '#testutils/TypeGuards.js'
import Sinon from 'sinon'

const sandbox = Sinon.createSandbox()

interface KnexStub {
  select: Sinon.SinonStub
  increment: Sinon.SinonStub
  update: Sinon.SinonStub
  whereIn: Sinon.SinonStub
  orWhere: Sinon.SinonStub
  where: Sinon.SinonStub
  limit: Sinon.SinonStub
}
const makeKnexInstance = (): KnexStub => {
  // `where` defaults to chainable (returns the instance) but uses callsFake instead of
  // returnsThis() so that per-test overrides like `.resolves(N)` can replace it cleanly.
  const inst: KnexStub = {
    select: sandbox.stub().returnsThis(),
    increment: sandbox.stub().returnsThis(),
    update: sandbox.stub().returnsThis(),
    whereIn: sandbox.stub().resolves([]),
    orWhere: sandbox.stub().resolves([]),
    limit: sandbox.stub().resolves([]),
    where: sandbox.stub(),
  }
  inst.where.callsFake(() => inst)
  return inst
}
describe('routes/apiFunctions function SetLatestPicture', () => {
  let knexStub = sandbox.stub()
  let knexFake = StubToKnex(knexStub)
  let getParentFoldersStub = sandbox.stub()
  let loggerStub: Sinon.SinonStub = sandbox.stub()
  beforeEach(() => {
    knexStub = sandbox.stub().callsFake(() => StubToKnex(makeKnexInstance()))
    knexFake = StubToKnex(knexStub)
    getParentFoldersStub = sandbox.stub(Imports, 'GetParentFolders').returns([])
    loggerStub = sandbox.stub(Imports, 'logger')
  })
  afterEach(() => {
    sandbox.restore()
  })

  // ---- Existence-check chain ----

  it('should call knex with the pictures table when checking existence', async () => {
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.firstCall.args).to.deep.equal(['pictures'])
  })
  it('should call select once when checking picture existence', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.select.callCount).to.equal(1)
  })
  it('should select path column when checking picture existence', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.select.firstCall.args).to.deep.equal(['path'])
  })
  it('should call where once when filtering existence-check by path', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.where.callCount).to.equal(1)
  })
  it('should filter existence-check by provided path', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.where.firstCall.args).to.deep.equal([{ path: '/foo/bar/image.pdf' }])
  })
  it('should call limit when checking picture existence', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.limit.callCount).to.equal(1)
  })
  it('should limit existence check to a single record', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.limit.firstCall.args).to.deep.equal([1])
  })

  // ---- Picture not found ----

  it('should resolve to null when path is not found', async () => {
    const result = await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(result).to.equal(null)
  })
  it('should make no additional knex calls when picture not found', async () => {
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.callCount).to.equal(1)
  })
  it('should log when picture is not found', async () => {
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('SetLatestPicture: picture not found'))
    expect(matched).to.equal(true)
  })

  // ---- Conditional UPDATE on pictures (atomic flip) ----

  const setupExistingPicture = (): KnexStub => {
    const searcher = makeKnexInstance()
    searcher.limit.resolves([{ path: '/foo/bar/image.pdf' }])
    knexStub.onCall(0).returns(searcher)
    return searcher
  }

  it('should call knex with the pictures table for the conditional UPDATE', async () => {
    setupExistingPicture()
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.getCall(1).args).to.deep.equal(['pictures'])
  })
  it('should call update once on the conditional UPDATE', async () => {
    setupExistingPicture()
    const cond = makeKnexInstance()
    knexStub.onCall(1).returns(cond)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(cond.update.callCount).to.equal(1)
  })
  it('should set seen=true on the conditional UPDATE', async () => {
    setupExistingPicture()
    const cond = makeKnexInstance()
    knexStub.onCall(1).returns(cond)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(cond.update.firstCall.args).to.deep.equal([{ seen: true }])
  })
  it('should atomically gate the conditional UPDATE on path AND seen=false', async () => {
    setupExistingPicture()
    const cond = makeKnexInstance()
    knexStub.onCall(1).returns(cond)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(cond.where.firstCall.args).to.deep.equal([{ path: '/foo/bar/image.pdf', seen: false }])
  })

  // ---- Conditional update flips 0 rows (already seen / lost-the-race) ----

  const setupAlreadySeen = (): KnexStub => {
    setupExistingPicture()
    const cond = makeKnexInstance()
    cond.where.resolves(0)
    knexStub.onCall(1).returns(cond)
    return cond
  }

  it('should not increment seenCount when conditional update flips zero rows', async () => {
    setupAlreadySeen()
    const folderInst = makeKnexInstance()
    knexStub.onCall(2).returns(folderInst)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(folderInst.increment.callCount).to.equal(0)
  })
  it('should call knex three times when conditional update flips zero rows', async () => {
    setupAlreadySeen()
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.callCount).to.equal(3)
  })
  it('should query folders to update current cover when conditional update flips zero rows', async () => {
    setupAlreadySeen()
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.getCall(2).args).to.deep.equal(['folders'])
  })

  // ---- Conditional update flips 1 row (caller is the flipper) ----

  const setupSuccessfulFlip = (): KnexStub => {
    setupExistingPicture()
    const cond = makeKnexInstance()
    cond.where.resolves(1)
    knexStub.onCall(1).returns(cond)
    return cond
  }

  it('should call knex four times when conditional update flips a row', async () => {
    setupSuccessfulFlip()
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.callCount).to.equal(4)
  })
  it('should query folders to increment seen count when conditional update flips a row', async () => {
    setupSuccessfulFlip()
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.getCall(2).args).to.deep.equal(['folders'])
  })
  it('should call increment once when conditional update flips a row', async () => {
    setupSuccessfulFlip()
    const incrementer = makeKnexInstance()
    knexStub.onCall(2).returns(incrementer)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(incrementer.increment.callCount).to.equal(1)
  })
  it('should increment seenCount by 1 when conditional update flips a row', async () => {
    setupSuccessfulFlip()
    const incrementer = makeKnexInstance()
    knexStub.onCall(2).returns(incrementer)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(incrementer.increment.firstCall.args).to.deep.equal(['seenCount', 1])
  })
  it('should call GetParentFolders once when conditional update flips a row', async () => {
    setupSuccessfulFlip()
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(getParentFoldersStub.callCount).to.equal(1)
  })
  it('should pass the picture path to GetParentFolders when conditional update flips a row', async () => {
    setupSuccessfulFlip()
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(getParentFoldersStub.firstCall.args).to.deep.equal(['/foo/bar/image.pdf'])
  })
  it('should call whereIn once when filtering ancestor folders for increment', async () => {
    setupSuccessfulFlip()
    const incrementer = makeKnexInstance()
    knexStub.onCall(2).returns(incrementer)
    getParentFoldersStub.returns('FOOBAR')
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(incrementer.whereIn.callCount).to.equal(1)
  })
  it('should filter ancestor folders by path when incrementing seenCount', async () => {
    setupSuccessfulFlip()
    const incrementer = makeKnexInstance()
    knexStub.onCall(2).returns(incrementer)
    getParentFoldersStub.returns('FOOBAR')
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(incrementer.whereIn.firstCall.args).to.deep.equal(['path', 'FOOBAR'])
  })

  // ---- Final UPDATE folders.current (runs in both flip and no-flip paths) ----

  it('should query folders to update current cover after flipping', async () => {
    setupSuccessfulFlip()
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.getCall(3).args).to.deep.equal(['folders'])
  })
  it('should call update once on folders.current after flipping', async () => {
    setupSuccessfulFlip()
    const updater = makeKnexInstance()
    knexStub.onCall(3).returns(updater)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(updater.update.callCount).to.equal(1)
  })
  it('should set folders.current to the picture path after flipping', async () => {
    setupSuccessfulFlip()
    const updater = makeKnexInstance()
    knexStub.onCall(3).returns(updater)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(updater.update.firstCall.args).to.deep.equal([{ current: '/foo/bar/image.pdf' }])
  })
  it('should filter folders.current update by parent folder path', async () => {
    setupSuccessfulFlip()
    const updater = makeKnexInstance()
    knexStub.onCall(3).returns(updater)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(updater.where.firstCall.args).to.deep.equal([{ path: '/foo/bar/' }])
  })
  it('should set folders.current even when conditional update flips zero rows', async () => {
    setupAlreadySeen()
    const updater = makeKnexInstance()
    knexStub.onCall(2).returns(updater)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(updater.update.firstCall.args).to.deep.equal([{ current: '/foo/bar/image.pdf' }])
  })
})
