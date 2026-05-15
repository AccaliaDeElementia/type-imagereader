'use sanity'

import { readBody } from '#routes/api.js'

describe('routes/api readBody()', () => {
  it('should return body when successful parse', () => {
    const obj = {
      body: {
        path: 'this is my path',
        rand: Math.random(),
      },
    }
    expect(readBody(obj)).toBe(obj.body)
  })
  it('should throw when body does not parse', () => {
    expect(() => readBody({})).toThrow('Invalid JSON Object provided as input')
  })
})
