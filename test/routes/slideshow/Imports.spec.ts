'use sanity'

import Sinon from 'sinon'
import { Functions } from '../../../routes/apiFunctions'
import { StubToKnex } from '../../testutils/TypeGuards'
import { Imports } from '../../../routes/slideshow'
import { expect } from 'chai'
import { EventuallyRejects } from '../../testutils/Errors'

describe('routes/slideshow Imports', () => {
  let setLatestPictureStub = Sinon.stub()
  let knexFake = StubToKnex({})
  beforeEach(() => {
    knexFake = StubToKnex({})
    setLatestPictureStub = Sinon.stub(Functions, 'SetLatestPicture').resolves()
  })
  afterEach(() => {
    setLatestPictureStub.restore()
  })
  describe('setLatest()', () => {
    it('shoudl call api function SetLatestPicture', async () => {
      await Imports.setLatest(knexFake, '')
      expect(setLatestPictureStub.callCount).to.equal(1)
    })
    it('shoudl call SetLatestPicture with knex', async () => {
      await Imports.setLatest(knexFake, '')
      expect(setLatestPictureStub.firstCall.args[0]).to.equal(knexFake)
    })
    it('shoudl call SetLatestPicture with path', async () => {
      await Imports.setLatest(knexFake, '/foo/bar/baz')
      expect(setLatestPictureStub.firstCall.args[1]).to.equal('/foo/bar/baz')
    })
    it('shoudl not catch rejection from SetLatestPicture', async () => {
      const err = new Error('PKACHU! SMASH!')
      setLatestPictureStub.rejects(err)
      const result = await EventuallyRejects(Imports.setLatest(knexFake, ''))
      expect(result).to.equal(err)
    })
    it('shoudl not catch thrown error from SetLatestPicture', async () => {
      const err = new Error('PKACHU! SMASH!')
      setLatestPictureStub.throws(err)
      const result = await EventuallyRejects(Imports.setLatest(knexFake, ''))
      expect(result).to.equal(err)
    })
  })
})
