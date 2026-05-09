'use sanity'

import { expect } from 'chai'
import { GetEnvironmentName } from '#utils/persistance.js'

describe('utils/persistance GetEnvironmentName()', () => {
  let envValue: string | undefined = undefined
  beforeAll(() => {
    envValue = process.env.DB_CLIENT
  })
  afterAll(() => {
    if (envValue === undefined) {
      delete process.env.DB_CLIENT
    } else {
      process.env.DB_CLIENT = envValue
    }
  })
  it('should default to development when DB_CLIENT environment variable unset', () => {
    delete process.env.DB_CLIENT
    expect(GetEnvironmentName()).to.equal('development')
  })
  it('should default to development when DB_CLIENT environment variable empty', () => {
    process.env.DB_CLIENT = ''
    expect(GetEnvironmentName()).to.equal('development')
  })
  it('should retrieve env variable value when DB_CLIENT environment variable set', () => {
    process.env.DB_CLIENT = 'i am legendary foxxo'
    expect(GetEnvironmentName()).to.equal('i am legendary foxxo')
  })
})
