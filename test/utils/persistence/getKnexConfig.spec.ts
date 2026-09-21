'use sanity'

import { getKnexConfig, Internals } from '#utils/persistence.js'
import type { KnexOptions } from '#utils/persistence.js'
import type { MockInstance } from 'vitest'

type ConnectionField = keyof KnexOptions['connection']

interface EnvOverride {
  field: ConnectionField
  envVar: string
}

const envOverrides: EnvOverride[] = [
  { field: 'host', envVar: 'DB_HOST' },
  { field: 'database', envVar: 'DB_DATABASE' },
  { field: 'user', envVar: 'DB_USER' },
  { field: 'password', envVar: 'DB_PASSWORD' },
  { field: 'filename', envVar: 'DB_FILENAME' },
]

const OVERRIDE_VALUE = 'foobar'

const configuredConnection = (): KnexOptions['connection'] => {
  const connection: KnexOptions['connection'] = {}
  envOverrides.forEach(({ field }: EnvOverride): void => {
    connection[field] = `configured ${field}`
  })
  return connection
}

describe('utils/persistence getKnexConfig()', () => {
  const envAtLoad = new Map(envOverrides.map(({ envVar }: EnvOverride) => [envVar, process.env[envVar]]))
  let configBlock: KnexOptions = { client: '', connection: {}, migrations: { tableName: '' } }
  let readConfigurationBlockStub: MockInstance = vi.fn()
  beforeEach(() => {
    envOverrides.forEach(({ envVar }: EnvOverride): void => {
      Reflect.deleteProperty(process.env, envVar)
    })
    configBlock = { client: '', connection: configuredConnection(), migrations: { tableName: '' } }
    readConfigurationBlockStub = vi.spyOn(Internals, 'readConfigurationBlock').mockResolvedValue(configBlock)
  })
  afterEach(() => {
    envAtLoad.forEach((value: string | undefined, envVar: string): void => {
      if (value === undefined) {
        Reflect.deleteProperty(process.env, envVar)
      } else {
        process.env[envVar] = value
      }
    })
  })

  it('should reject when readConfig rejects', async () => {
    readConfigurationBlockStub.mockRejectedValue(new Error('FOO I FAIL'))
    await expect(getKnexConfig()).rejects.toHaveProperty('message', 'FOO I FAIL')
  })
  it('should leave every connection field as configured when no DB_ env var is set', async () => {
    const conn = await getKnexConfig()
    expect(conn.connection).toEqual(configuredConnection())
  })
  envOverrides.forEach(({ field, envVar }: EnvOverride): void => {
    it(`should override only ${field} when ${envVar} is set`, async () => {
      process.env[envVar] = OVERRIDE_VALUE
      const conn = await getKnexConfig()
      expect(conn.connection).toEqual({ ...configuredConnection(), [field]: OVERRIDE_VALUE })
    })
  })
  it('should override with an empty string when the env var is set but empty', async () => {
    process.env.DB_PASSWORD = ''
    const conn = await getKnexConfig()
    expect(conn.connection).toEqual({ ...configuredConnection(), password: '' })
  })
})
