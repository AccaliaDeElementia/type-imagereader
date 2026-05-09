'use sanity'

import Sinon from 'sinon'
import { stubToKnex } from '#testutils/TypeGuards.js'
import { Imports } from '#routes/slideshow.js'
import { expect } from 'chai'
import { eventuallyRejects } from '#testutils/Errors.js'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow Imports', () => {
  let setLatestPictureStub = sandbox.stub()
  let knexFake = stubToKnex({})
  beforeEach(() => {
    knexFake = stubToKnex({})
    setLatestPictureStub = sandbox.stub(Imports, 'SetLatestPicture').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  describe('setLatest()', () => {
    it('should call api function SetLatestPicture', async () => {
      await Imports.setLatest(knexFake, '')
      expect(setLatestPictureStub.callCount).to.equal(1)
    })
    it('should call SetLatestPicture with knex', async () => {
      await Imports.setLatest(knexFake, '')
      expect(setLatestPictureStub.firstCall.args[0]).to.equal(knexFake)
    })
    it('should call SetLatestPicture with path', async () => {
      await Imports.setLatest(knexFake, '/foo/bar/baz')
      expect(setLatestPictureStub.firstCall.args[1]).to.equal('/foo/bar/baz')
    })
    it('should not catch rejection from SetLatestPicture', async () => {
      const err = new Error('PKACHU! SMASH!')
      setLatestPictureStub.rejects(err)
      const result = await eventuallyRejects(Imports.setLatest(knexFake, ''))
      expect(result).to.equal(err)
    })
    it('should not catch thrown error from SetLatestPicture', async () => {
      const err = new Error('PKACHU! SMASH!')
      setLatestPictureStub.throws(err)
      const result = await eventuallyRejects(Imports.setLatest(knexFake, ''))
      expect(result).to.equal(err)
    })
  })
})
