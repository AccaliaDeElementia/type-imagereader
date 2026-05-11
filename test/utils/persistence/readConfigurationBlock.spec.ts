'use sanity'

import { readConfigurationBlock, Internals, Imports } from '#utils/persistence.js'
import Sinon from 'sinon'
import { eventuallyRejects } from '#testutils/errors.js'

const sandbox = Sinon.createSandbox()

describe('utils/persistence readConfigurationBlock()', () => {
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
  let readFileStub = sandbox.stub()
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
    sandbox.stub(Internals, 'getEnvironmentName').returns(configName)
    readFileStub = sandbox
      .stub(Imports, 'readFile')
      .callsFake(async () => await Promise.resolve(JSON.stringify(configContent)))
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should resolve to object', async () => {
    const result = await readConfigurationBlock()
    expect(result).toEqual(configContent.testtest)
  })
  it('should reject when ReadFile rejects', async () => {
    readFileStub.rejects(new Error('poopy pants are no fun'))
    const err = await eventuallyRejects(readConfigurationBlock())
    expect(err.message).toBe('poopy pants are no fun')
  })
  it('should reject on empty file', async () => {
    readFileStub.resolves('')
    const err = await eventuallyRejects(readConfigurationBlock())
    expect(err.message).toBe('Invalid Configuration Detected!')
  })
  it('should reject on invalid JSON file', async () => {
    readFileStub.resolves('"')
    const err = await eventuallyRejects(readConfigurationBlock())
    expect(err.message).toBe('Unterminated string in JSON at position 1 (line 1 column 2)')
  })
  it('should reject on non object file', async () => {
    readFileStub.resolves('"not an object"')
    const err = await eventuallyRejects(readConfigurationBlock())
    expect(err.message).toBe('Invalid Configuration Detected!')
  })
  it('should reject on missing environment block file', async () => {
    readFileStub.resolves('{"a": {}}')
    const err = await eventuallyRejects(readConfigurationBlock())
    expect(err.message).toBe('Invalid Configuration Detected!')
  })
  it('should reject on bad config section file', async () => {
    configContent.testtest.client = null
    const err = await eventuallyRejects(readConfigurationBlock())
    expect(err.message).toBe('Invalid Configuration Detected!')
  })
})
