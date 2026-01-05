'use sanity'

import { expect } from 'chai'
import { ReadBody } from '../../../routes/api'
import { DefinitelyThrows } from '../../testutils/Errors'

describe('routes/api function ReadBody()', () => {
  it('should return body when successful parse', () => {
    const obj = {
      body: {
        path: 'this is my path',
        rand: Math.random(),
      },
    }
    expect(ReadBody(obj)).to.equal(obj.body)
  })
  it('should throw when body does not parse', () => {
    const err = DefinitelyThrows(() => ReadBody({}))
    expect(err.message).to.equal('Invalid JSON Object provided as input')
  })
})
