'use sanity'

import { expect } from 'chai'
import { readBody } from '#routes/api.js'
import { definitelyThrows } from '#testutils/Errors.js'

describe('routes/api readBody()', () => {
  it('should return body when successful parse', () => {
    const obj = {
      body: {
        path: 'this is my path',
        rand: Math.random(),
      },
    }
    expect(readBody(obj)).to.equal(obj.body)
  })
  it('should throw when body does not parse', () => {
    const err = definitelyThrows(() => readBody({}))
    expect(err.message).to.equal('Invalid JSON Object provided as input')
  })
})
