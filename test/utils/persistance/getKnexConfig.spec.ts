'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/persistance'
import Sinon from 'sinon'
import { EventuallyRejects } from '../../testutils/Errors'

describe('utils/persistance function getKnexConfig()', () => {
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
  let readConfigurationBlockStub = Sinon.stub()
  beforeEach(() => {
    delete process.env.DB_HOST
    delete process.env.DB_DATABASE
    delete process.env.DB_USER
    delete process.env.DB_PASSWORD
    delete process.env.DB_FILENAME
    configBlock = {
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
    readConfigurationBlockStub = Sinon.stub(Functions, 'readConfigurationBlock').resolves(configBlock)
  })

  afterEach(() => {
    readConfigurationBlockStub.restore()
  })
  it('should reject when readConfig rejects', async () => {
    readConfigurationBlockStub.rejects(new Error('FOO I FAIL'))
    const err = await EventuallyRejects(Functions.getKnexConfig())
    expect(err.message).to.equal('FOO I FAIL')
  })
  it('should not alter host when env is not set', async () => {
    configBlock.connection.host = 'one two three four'
    const conn = await Functions.getKnexConfig()
    expect(conn.connection.host).to.equal('one two three four')
  })
  it('should alter host when env is set', async () => {
    configBlock.connection.host = 'one two three four'
    process.env.DB_HOST = 'foobar'
    const conn = await Functions.getKnexConfig()
    expect(conn.connection.host).to.equal('foobar')
  })
  it('should not alter database when env is not set', async () => {
    configBlock.connection.database = 'one two three four'
    const conn = await Functions.getKnexConfig()
    expect(conn.connection.database).to.equal('one two three four')
  })
  it('should alter database when env is set', async () => {
    configBlock.connection.database = 'one two three four'
    process.env.DB_DATABASE = 'foobar'
    const conn = await Functions.getKnexConfig()
    expect(conn.connection.database).to.equal('foobar')
  })
  it('should not alter user when env is not set', async () => {
    configBlock.connection.user = 'one two three four'
    const conn = await Functions.getKnexConfig()
    expect(conn.connection.user).to.equal('one two three four')
  })
  it('should alter user when env is set', async () => {
    configBlock.connection.user = 'one two three four'
    process.env.DB_USER = 'foobar'
    const conn = await Functions.getKnexConfig()
    expect(conn.connection.user).to.equal('foobar')
  })
  it('should not alter password when env is not set', async () => {
    configBlock.connection.password = 'one two three four'
    const conn = await Functions.getKnexConfig()
    expect(conn.connection.password).to.equal('one two three four')
  })
  it('should alter password when env is set', async () => {
    configBlock.connection.host = 'one two three four'
    process.env.DB_PASSWORD = 'foobar'
    const conn = await Functions.getKnexConfig()
    expect(conn.connection.password).to.equal('foobar')
  })
  it('should not alter filename when env is not set', async () => {
    configBlock.connection.filename = 'one two three four'
    const conn = await Functions.getKnexConfig()
    expect(conn.connection.filename).to.equal('one two three four')
  })
  it('should alter filename when env is set', async () => {
    configBlock.connection.filename = 'one two three four'
    process.env.DB_FILENAME = 'foobar'
    const conn = await Functions.getKnexConfig()
    expect(conn.connection.filename).to.equal('foobar')
  })
})
