'use sanity'

import { getKnexConfig, Internals } from '#utils/persistence.js'
import { eventuallyRejects } from '#testutils/errors.js'
import type { MockInstance } from 'vitest'

describe('utils/persistence getKnexConfig()', () => {
  let configBlock = {
    client: '',
    connection: {
      host: '' as string | undefined,
      database: '' as string | undefined,
      user: '' as string | undefined,
      password: '' as string | undefined,
      filename: '' as string | undefined,
    },
    migrations: { tableName: '' },
  }
  let readConfigurationBlockStub: MockInstance = vi.fn()
  beforeEach(() => {
    delete process.env.DB_HOST
    delete process.env.DB_DATABASE
    delete process.env.DB_USER
    delete process.env.DB_PASSWORD
    delete process.env.DB_FILENAME
    configBlock = {
      client: '',
      connection: {
        host: '',
        database: '',
        user: '',
        password: '',
        filename: '',
      },
      migrations: { tableName: '' },
    }
    readConfigurationBlockStub = vi.spyOn(Internals, 'readConfigurationBlock').mockResolvedValue(configBlock)
  })

  it('should reject when readConfig rejects', async () => {
    readConfigurationBlockStub.mockRejectedValue(new Error('FOO I FAIL'))
    const err = await eventuallyRejects(getKnexConfig())
    expect(err.message).toBe('FOO I FAIL')
  })
  it('should not alter host when env is not set', async () => {
    configBlock.connection.host = 'one two three four'
    const conn = await getKnexConfig()
    expect(conn.connection.host).toBe('one two three four')
  })
  it('should alter host when env is set', async () => {
    configBlock.connection.host = 'one two three four'
    process.env.DB_HOST = 'foobar'
    const conn = await getKnexConfig()
    expect(conn.connection.host).toBe('foobar')
  })
  it('should not alter database when env is not set', async () => {
    configBlock.connection.database = 'one two three four'
    const conn = await getKnexConfig()
    expect(conn.connection.database).toBe('one two three four')
  })
  it('should alter database when env is set', async () => {
    configBlock.connection.database = 'one two three four'
    process.env.DB_DATABASE = 'foobar'
    const conn = await getKnexConfig()
    expect(conn.connection.database).toBe('foobar')
  })
  it('should not alter user when env is not set', async () => {
    configBlock.connection.user = 'one two three four'
    const conn = await getKnexConfig()
    expect(conn.connection.user).toBe('one two three four')
  })
  it('should alter user when env is set', async () => {
    configBlock.connection.user = 'one two three four'
    process.env.DB_USER = 'foobar'
    const conn = await getKnexConfig()
    expect(conn.connection.user).toBe('foobar')
  })
  it('should not alter password when env is not set', async () => {
    configBlock.connection.password = 'one two three four'
    const conn = await getKnexConfig()
    expect(conn.connection.password).toBe('one two three four')
  })
  it('should alter password when env is set', async () => {
    configBlock.connection.password = 'one two three four'
    process.env.DB_PASSWORD = 'foobar'
    const conn = await getKnexConfig()
    expect(conn.connection.password).toBe('foobar')
  })
  it('should not alter filename when env is not set', async () => {
    configBlock.connection.filename = 'one two three four'
    const conn = await getKnexConfig()
    expect(conn.connection.filename).toBe('one two three four')
  })
  it('should alter filename when env is set', async () => {
    configBlock.connection.filename = 'one two three four'
    process.env.DB_FILENAME = 'foobar'
    const conn = await getKnexConfig()
    expect(conn.connection.filename).toBe('foobar')
  })
})
