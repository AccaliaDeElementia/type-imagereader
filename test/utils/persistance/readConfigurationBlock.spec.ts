'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '../../../utils/persistance'
import Sinon from 'sinon'
import { EventuallyRejects } from '../../testutils/Errors'

describe('utils/persistance function readConfigurationBlock()', () => {
  let configContent = {
    testtest: {
      client: 'foo' as string | null,
      connection: {},
      migrations: {
        tableName: 'baz',
      },
    },
  }
  let configName = 'testtest'
  let getEnvironmentNameStub = Sinon.stub()
  let readFileStub = Sinon.stub()
  beforeEach(() => {
    configContent = {
      testtest: {
        client: 'foo' as string | null,
        connection: {},
        migrations: {
          tableName: 'baz',
        },
      },
    }
    configName = 'testtest'
    getEnvironmentNameStub = Sinon.stub(Functions, 'getEnvironmentName').returns(configName)
    readFileStub = Sinon.stub(Imports, 'readFile').callsFake(
      async () => await Promise.resolve(JSON.stringify(configContent)),
    )
  })
  afterEach(() => {
    getEnvironmentNameStub.restore()
    readFileStub.restore()
  })
  it('should resolve to object', async () => {
    const result = await Functions.readConfigurationBlock()
    expect(result).to.deep.equal(configContent.testtest)
  })
  it('should reject when ReadFile rejects', async () => {
    readFileStub.rejects(new Error('poopy pants are no fun'))
    const err = await EventuallyRejects(Functions.readConfigurationBlock())
    expect(err.message).to.equal('poopy pants are no fun')
  })
  it('should reject on empty file', async () => {
    readFileStub.resolves('')
    const err = await EventuallyRejects(Functions.readConfigurationBlock())
    expect(err.message).to.equal('Invalid Configuration Detected!')
  })
  it('should reject on invalid JSON file', async () => {
    readFileStub.resolves('"')
    const err = await EventuallyRejects(Functions.readConfigurationBlock())
    expect(err.message).to.equal('Unterminated string in JSON at position 1 (line 1 column 2)')
  })
  it('should reject on non object file', async () => {
    readFileStub.resolves('"not an object"')
    const err = await EventuallyRejects(Functions.readConfigurationBlock())
    expect(err.message).to.equal('Invalid Configuration Detected!')
  })
  it('should reject on missing environment block file', async () => {
    readFileStub.resolves('{"a": {}}')
    const err = await EventuallyRejects(Functions.readConfigurationBlock())
    expect(err.message).to.equal('Invalid Configuration Detected!')
  })
  it('should reject on bad config section file', async () => {
    configContent.testtest.client = null
    const err = await EventuallyRejects(Functions.readConfigurationBlock())
    expect(err.message).to.equal('Invalid Configuration Detected!')
  })
})
