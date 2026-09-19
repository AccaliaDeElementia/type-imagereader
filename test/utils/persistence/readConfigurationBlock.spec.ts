'use sanity'

import { readConfigurationBlock, Internals, Imports } from '#utils/persistence.js'
import type { MockInstance } from 'vitest'

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
  let readFileStub: MockInstance = vi.fn()
  beforeEach(() => {
    configContent = {
      testtest: {
        client: 'foo',
        connection: {},
        migrations: {
          tableName: 'baz',
        },
      },
    }
    configName = 'testtest'
    vi.spyOn(Internals, 'getEnvironmentName').mockReturnValue(configName)
    readFileStub = vi
      .spyOn(Imports, 'readFile')
      .mockImplementation(async () => await Promise.resolve(JSON.stringify(configContent)))
  })
  it('should resolve to the configuration block named by getEnvironmentName', async () => {
    const result = await readConfigurationBlock()
    expect(result).toEqual(configContent.testtest)
  })
  it('should reject when ReadFile rejects', async () => {
    readFileStub.mockRejectedValue(new Error('poopy pants are no fun'))
    await expect(readConfigurationBlock()).rejects.toHaveProperty('message', 'poopy pants are no fun')
  })
  it('should reject on empty file', async () => {
    readFileStub.mockResolvedValue('')
    await expect(readConfigurationBlock()).rejects.toHaveProperty('message', 'Invalid Configuration Detected!')
  })
  it('should reject on invalid JSON file', async () => {
    readFileStub.mockResolvedValue('"')
    await expect(readConfigurationBlock()).rejects.toHaveProperty(
      'message',
      'Unterminated string in JSON at position 1 (line 1 column 2)',
    )
  })
  it('should reject on non object file', async () => {
    readFileStub.mockResolvedValue('"not an object"')
    await expect(readConfigurationBlock()).rejects.toHaveProperty('message', 'Invalid Configuration Detected!')
  })
  it('should reject on missing environment block file', async () => {
    readFileStub.mockResolvedValue('{"a": {}}')
    await expect(readConfigurationBlock()).rejects.toHaveProperty('message', 'Invalid Configuration Detected!')
  })
  it('should reject on bad config section file', async () => {
    configContent.testtest.client = null
    await expect(readConfigurationBlock()).rejects.toHaveProperty('message', 'Invalid Configuration Detected!')
  })
})
