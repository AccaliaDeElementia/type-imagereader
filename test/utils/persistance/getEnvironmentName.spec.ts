'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/persistance'

describe('utils/persistance function getEnvironmentName()', () => {
  let envValue: string | undefined = undefined
  before(() => {
    envValue = process.env.DB_CLIENT
  })
  after(() => {
    if (envValue === undefined) {
      delete process.env.DB_CLIENT
    } else {
      process.env.DB_CLIENT = envValue
    }
  })
  it('should default to development when DB_CLIENT environemnt variable unset', () => {
    delete process.env.DB_CLIENT
    expect(Functions.getEnvironmentName()).to.equal('development')
  })
  it('should default to development when DB_CLIENT environemnt variable empty', () => {
    process.env.DB_CLIENT = ''
    expect(Functions.getEnvironmentName()).to.equal('development')
  })
  it('should retrieve env variable value when DB_CLIENT environemnt variable set', () => {
    process.env.DB_CLIENT = 'i am legendary foxxo'
    expect(Functions.getEnvironmentName()).to.equal('i am legendary foxxo')
  })
})
