'use sanity'

import Sinon from 'sinon'
import { StubToKnex } from '#testutils/TypeGuards.js'
import { expect } from 'chai'
import { Functions, Imports } from '#routes/slideshow.js'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow function MarkImageRead()', () => {
  let conditionalUpdate = {
    update: sandbox.stub().returnsThis(),
    where: sandbox.stub().resolves(0),
  }
  let incrementer = {
    increment: sandbox.stub().returnsThis(),
    whereIn: sandbox.stub().resolves(),
  }
  let knexStub = sandbox.stub().onFirstCall().returns(conditionalUpdate).onSecondCall().returns(incrementer)
  let knexFake = StubToKnex(knexStub)
  let getParentFoldersStub = sandbox.stub()
  beforeEach(() => {
    conditionalUpdate = {
      update: sandbox.stub().returnsThis(),
      where: sandbox.stub().resolves(0),
    }
    incrementer = {
      increment: sandbox.stub().returnsThis(),
      whereIn: sandbox.stub().resolves(),
    }
    knexStub = sandbox.stub().onFirstCall().returns(conditionalUpdate).onSecondCall().returns(incrementer)
    knexFake = StubToKnex(knexStub)
    getParentFoldersStub = sandbox.stub(Imports, 'GetParentFolders').returns(['/foo/bar/', '/foo/', '/'])
  })
  afterEach(() => {
    sandbox.restore()
  })

  // ---- Conditional UPDATE on pictures ----

  it('should call knex with the pictures table for the conditional UPDATE', async () => {
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(knexStub.firstCall.args).to.deep.equal(['pictures'])
  })
  it('should call update once on the conditional UPDATE', async () => {
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(conditionalUpdate.update.callCount).to.equal(1)
  })
  it('should set seen=true on the conditional UPDATE', async () => {
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(conditionalUpdate.update.firstCall.args).to.deep.equal([{ seen: true }])
  })
  it('should atomically gate the conditional UPDATE on path AND seen=false', async () => {
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(conditionalUpdate.where.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz.png', seen: false }])
  })

  // ---- Conditional update flipped 0 rows (already seen / lost the race) ----

  it('should make only one knex call when conditional update flips zero rows', async () => {
    conditionalUpdate.where.resolves(0)
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(knexStub.callCount).to.equal(1)
  })
  it('should not call GetParentFolders when conditional update flips zero rows', async () => {
    conditionalUpdate.where.resolves(0)
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(getParentFoldersStub.callCount).to.equal(0)
  })

  // ---- Conditional update flipped a row (caller is the flipper) ----

  it('should make two knex calls when conditional update flips a row', async () => {
    conditionalUpdate.where.resolves(1)
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(knexStub.callCount).to.equal(2)
  })
  it('should query the folders table to increment seenCount when conditional update flips a row', async () => {
    conditionalUpdate.where.resolves(1)
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(knexStub.secondCall.args).to.deep.equal(['folders'])
  })
  it('should call increment once when conditional update flips a row', async () => {
    conditionalUpdate.where.resolves(1)
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(incrementer.increment.callCount).to.equal(1)
  })
  it('should increment seenCount by 1 when conditional update flips a row', async () => {
    conditionalUpdate.where.resolves(1)
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(incrementer.increment.firstCall.args).to.deep.equal(['seenCount', 1])
  })
  it('should call GetParentFolders once when conditional update flips a row', async () => {
    conditionalUpdate.where.resolves(1)
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(getParentFoldersStub.callCount).to.equal(1)
  })
  it('should pass the image path to GetParentFolders when conditional update flips a row', async () => {
    conditionalUpdate.where.resolves(1)
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(getParentFoldersStub.firstCall.args).to.deep.equal(['/foo/bar/baz.png'])
  })
  it('should call whereIn once when filtering ancestor folders for the increment', async () => {
    conditionalUpdate.where.resolves(1)
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(incrementer.whereIn.callCount).to.equal(1)
  })
  it('should filter ancestor folders using the result of GetParentFolders', async () => {
    conditionalUpdate.where.resolves(1)
    await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
    expect(incrementer.whereIn.firstCall.args).to.deep.equal(['path', ['/foo/bar/', '/foo/', '/']])
  })
})
