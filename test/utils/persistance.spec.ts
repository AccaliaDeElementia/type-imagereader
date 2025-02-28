'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import type Sinon from 'sinon'
import * as sinon from 'sinon'

import persistance, { Functions, Imports, isDictionary, isKnexOptions, type KnexOptions } from '../../utils/persistance'
import { StubToKnex } from '../testutils/TypeGuards'

@suite
export class PersistanceIsKnexOptions {
  @test
  'it should accept base object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        user: 'bar',
        password: 'bar',
        filename: 'bar',
      },
      useNullAsDefault: false,
      pool: {
        min: 0,
        max: -1,
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(true)
  }

  @test
  'it should reject null object'(): void {
    const obj = null
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined object'(): void {
    const obj = undefined
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject non object object'(): void {
    const obj = '{ invalid! }'
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject null client object'(): void {
    const obj = {
      client: null,
      connection: {},
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined client object'(): void {
    const obj = {
      client: undefined,
      connection: {},
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject missing client object'(): void {
    const obj = {
      connection: {},
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject non string client object'(): void {
    const obj = {
      client: {},
      connection: {},
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject null connection object'(): void {
    const obj = {
      client: 'foo',
      connection: null,
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined connection object'(): void {
    const obj = {
      client: 'foo',
      connection: undefined,
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject missing connection object'(): void {
    const obj = {
      client: 'foo',
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject non object connection object'(): void {
    const obj = {
      client: 'foo',
      connection: 'invalid!',
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject null connection host object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: null,
        database: 'bar',
        user: 'bar',
        password: 'bar',
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined conenction host object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: undefined,
        database: 'bar',
        user: 'bar',
        password: 'bar',
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should accept missing connection host object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        database: 'bar',
        user: 'bar',
        password: 'bar',
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(true)
  }

  @test
  'it should reject non string connection host object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 42,
        database: 'bar',
        user: 'bar',
        password: 'bar',
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject null connection database object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: null,
        user: 'bar',
        password: 'bar',
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined connection database object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: undefined,
        user: 'bar',
        password: 'bar',
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should accept missing connection database object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        user: 'bar',
        password: 'bar',
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(true)
  }

  @test
  'it should reject null connection user object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        user: null,
        password: 'bar',
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined connection user object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        user: undefined,
        password: 'bar',
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should accept missing connection user object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        password: 'bar',
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(true)
  }

  @test
  'it should reject non string connection user object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        user: {},
        password: 'bar',
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject null connection password object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        user: 'bar',
        password: null,
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined connection password object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        user: 'bar',
        password: undefined,
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should accept missing connection password object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        user: 'bar',
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(true)
  }

  @test
  'it should reject non string connection password object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        user: 'bar',
        password: false,
        filename: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject null connection filename object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        user: 'bar',
        password: 'bar',
        filename: null,
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined connection filename object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        user: 'bar',
        password: 'bar',
        filename: undefined,
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should accept missing connection filename object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        user: 'bar',
        password: 'bar',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(true)
  }

  @test
  'it should reject non string connection filename object'(): void {
    const obj = {
      client: 'foo',
      connection: {
        host: 'bar',
        database: 'bar',
        user: 'bar',
        password: 'bar',
        filename: [],
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject null useNullAsDefault object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      useNullAsDefault: null,
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined useNullAsDefault object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      useNullAsDefault: undefined,
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should accept missing useNullAsDefault object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(true)
  }

  @test
  'it should reject non boolean useNullAsDefault object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      useNullAsDefault: 'false',
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject null pool object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      pool: null,
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined pool object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      pool: undefined,
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should accept missing pool object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(true)
  }

  @test
  'it should reject non object pool object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      pool: Math.PI,
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject null pool min object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      pool: {
        min: null,
        max: -1,
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined pool min object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      pool: {
        min: undefined,
        max: -1,
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject missing pool min object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      pool: {
        max: -1,
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject non number pool min object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      pool: {
        min: 'minimum',
        max: -1,
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject null pool max object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      pool: {
        min: 0,
        max: null,
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined pool max object object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      pool: {
        min: 0,
        max: undefined,
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject missing pool max object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      pool: {
        min: 0,
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject non string pool min object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      pool: {
        min: 0,
        max: 'all of them',
      },
      migrations: {
        tableName: 'baz',
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject null migrations object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      migrations: null,
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined migrations object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      migrations: undefined,
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject missing migrations object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject non object migrations object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      migrations: false,
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject null migrations tablename object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      migrations: {
        tableName: null,
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject undefined migrations tablename object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      migrations: {
        tableName: undefined,
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject missing migrations tablename object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      migrations: {},
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }

  @test
  'it should reject non string migrations tablename object'(): void {
    const obj = {
      client: 'foo',
      connection: {},
      migrations: {
        tableName: {},
      },
    }
    expect(isKnexOptions(obj)).to.equal(false)
  }
}

@suite
export class PersistanceIsDictionaryTests {
  @test
  'it should accept basic map'(): void {
    const obj = {
      a: 43,
    }
    expect(isDictionary(obj)).to.equal(true)
  }

  @test
  'it should reject null object'(): void {
    const obj = null
    expect(isDictionary(obj)).to.equal(false)
  }

  @test
  'it should reject undefined object'(): void {
    const obj = undefined
    expect(isDictionary(obj)).to.equal(false)
  }

  @test
  'it should reject non object object'(): void {
    const obj = 0
    expect(isDictionary(obj)).to.equal(false)
  }
}

@suite
export class PersistanceReadConfigurationBlock {
  ConfigContent = {
    testtest: {
      client: 'foo' as string | null,
      connection: {},
      migrations: {
        tableName: 'baz',
      },
    },
  }
  ConfigName = 'testtest'

  GetEnvironmentNameStub?: sinon.SinonStub
  ReadFileStub?: sinon.SinonStub

  before(): void {
    this.GetEnvironmentNameStub = sinon.stub(Functions, 'getEnvironmentName').returns(this.ConfigName)
    this.ReadFileStub = sinon
      .stub(Imports, 'readFile')
      .callsFake(async () => await Promise.resolve(JSON.stringify(this.ConfigContent)))
  }

  after(): void {
    this.GetEnvironmentNameStub?.restore()
    this.ReadFileStub?.restore()
  }

  @test
  async 'it should resolve to object'(): Promise<void> {
    const result = await Functions.readConfigurationBlock()
    expect(result).to.deep.equal(this.ConfigContent.testtest)
  }

  @test
  async 'it should reject when ReadFile rejects'(): Promise<void> {
    this.ReadFileStub?.rejects(new Error('poopy pants are no fun'))
    try {
      await Functions.readConfigurationBlock()
      expect.fail('Should have rejected from prior await')
    } catch (e: unknown) {
      if (!(e instanceof Error)) throw new Error('Wrong object type rejected')
      expect(e.message).to.equal('poopy pants are no fun')
    }
  }

  @test
  async 'it should reject on empty file'(): Promise<void> {
    this.ReadFileStub?.resolves('')
    try {
      await Functions.readConfigurationBlock()
      expect.fail('Should have rejected from prior await')
    } catch (e: unknown) {
      if (!(e instanceof Error)) throw new Error('Wrong object type rejected')
      expect(e.message).to.equal('Invalid Configuration Detected!')
    }
  }

  @test
  async 'it should reject on invalid JSON file'(): Promise<void> {
    this.ReadFileStub?.resolves('"')
    try {
      await Functions.readConfigurationBlock()
      expect.fail('Should have rejected from prior await')
    } catch (e: unknown) {
      if (!(e instanceof Error)) throw new Error('Wrong object type rejected')
      expect(e.message).to.equal('Unterminated string in JSON at position 1 (line 1 column 2)')
    }
  }

  @test
  async 'it should reject on non object file'(): Promise<void> {
    this.ReadFileStub?.resolves('"not an object"')
    try {
      await Functions.readConfigurationBlock()
      expect.fail('Should have rejected from prior await')
    } catch (e: unknown) {
      if (!(e instanceof Error)) throw new Error('Wrong object type rejected')
      expect(e.message).to.equal('Invalid Configuration Detected!')
    }
  }

  @test
  async 'it should reject on missing environment block file'(): Promise<void> {
    this.ReadFileStub?.resolves('{"a": {}}')
    try {
      await Functions.readConfigurationBlock()
      expect.fail('Should have rejected from prior await')
    } catch (e: unknown) {
      if (!(e instanceof Error)) throw new Error('Wrong object type rejected')
      expect(e.message).to.equal('Invalid Configuration Detected!')
    }
  }

  @test
  async 'it should reject on bad config section file'(): Promise<void> {
    this.ConfigContent.testtest.client = null
    try {
      await Functions.readConfigurationBlock()
      expect.fail('Should have rejected from prior await')
    } catch (e: unknown) {
      if (!(e instanceof Error)) throw new Error('Wrong object type rejected')
      expect(e.message).to.equal('Invalid Configuration Detected!')
    }
  }
}

@suite
export class PersistanceGetKnexConfigTests {
  ConfigBlock = {
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
  ReadConfigurationBlockStub?: sinon.SinonStub

  before(): void {
    delete process.env.DB_HOST
    delete process.env.DB_DATABASE
    delete process.env.DB_USER
    delete process.env.DB_PASSWORD
    delete process.env.DB_FILENAME
    this.ReadConfigurationBlockStub = sinon.stub(Functions, 'readConfigurationBlock').resolves(this.ConfigBlock)
  }

  after(): void {
    this.ReadConfigurationBlockStub?.restore()
  }

  @test
  async 'it should not alter host wehn env is not set'(): Promise<void> {
    this.ConfigBlock.connection.host = 'one two three four'
    const conn = await Functions.GetKnexConfig()
    expect(conn.connection.host).to.equal('one two three four')
  }

  @test
  async 'it should alter host when env is set'(): Promise<void> {
    this.ConfigBlock.connection.host = 'one two three four'
    process.env.DB_HOST = 'foobar'
    const conn = await Functions.GetKnexConfig()
    expect(conn.connection.host).to.equal('foobar')
  }

  @test
  async 'it should not alter database wehn env is not set'(): Promise<void> {
    this.ConfigBlock.connection.database = 'one two three four'
    const conn = await Functions.GetKnexConfig()
    expect(conn.connection.database).to.equal('one two three four')
  }

  @test
  async 'it should alter database when env is set'(): Promise<void> {
    this.ConfigBlock.connection.database = 'one two three four'
    process.env.DB_DATABASE = 'foobar'
    const conn = await Functions.GetKnexConfig()
    expect(conn.connection.database).to.equal('foobar')
  }

  @test
  async 'it should not alter user wehn env is not set'(): Promise<void> {
    this.ConfigBlock.connection.user = 'one two three four'
    const conn = await Functions.GetKnexConfig()
    expect(conn.connection.user).to.equal('one two three four')
  }

  @test
  async 'it should alter user when env is set'(): Promise<void> {
    this.ConfigBlock.connection.user = 'one two three four'
    process.env.DB_USER = 'foobar'
    const conn = await Functions.GetKnexConfig()
    expect(conn.connection.user).to.equal('foobar')
  }

  @test
  async 'it should not alter password wehn env is not set'(): Promise<void> {
    this.ConfigBlock.connection.password = 'one two three four'
    const conn = await Functions.GetKnexConfig()
    expect(conn.connection.password).to.equal('one two three four')
  }

  @test
  async 'it should alter password when env is set'(): Promise<void> {
    this.ConfigBlock.connection.host = 'one two three four'
    process.env.DB_PASSWORD = 'foobar'
    const conn = await Functions.GetKnexConfig()
    expect(conn.connection.password).to.equal('foobar')
  }

  @test
  async 'it should not alter filename wehn env is not set'(): Promise<void> {
    this.ConfigBlock.connection.filename = 'one two three four'
    const conn = await Functions.GetKnexConfig()
    expect(conn.connection.filename).to.equal('one two three four')
  }

  @test
  async 'it should alter filename when env is set'(): Promise<void> {
    this.ConfigBlock.connection.filename = 'one two three four'
    process.env.DB_FILENAME = 'foobar'
    const conn = await Functions.GetKnexConfig()
    expect(conn.connection.filename).to.equal('foobar')
  }
}

@suite
export class PersistanceGetEnvironmentNameTests {
  @test
  'it should choose `development` when environment DB_CLIENT is not set'(): void {
    delete process.env.DB_CLIENT
    expect(Functions.getEnvironmentName()).to.equal('development')
  }

  @test
  'it should choose `development` when environment DB_CLIENT is blank'(): void {
    process.env.DB_CLIENT = ''
    expect(Functions.getEnvironmentName()).to.equal('development')
  }

  @test
  'it should choose DB_CLIENT when set'(): void {
    process.env.DB_CLIENT = 'FOO ENV'
    expect(Functions.getEnvironmentName()).to.equal('FOO ENV')
  }
}

@suite
export class PersistanceInitializeTests {
  FakeEnvironment: KnexOptions = {
    client: 'fakeClient',
    connection: {
      host: 'fake host',
    },
    migrations: {
      tableName: 'migrations tablename',
    },
  }
  StubEnvironment?: Sinon.SinonStub
  StubKnex?: Sinon.SinonStub
  StubKnexInstance = {
    migrate: {
      latest: sinon.stub().resolves(),
    },
  }

  before(): void {
    Imports.Initializer = undefined
    this.StubKnex = sinon.stub(Imports, 'knex').returns(StubToKnex(this.StubKnexInstance))
    this.StubEnvironment = sinon.stub(Functions, 'GetKnexConfig').resolves(this.FakeEnvironment)
  }

  after(): void {
    this.StubKnex?.restore()
    this.StubEnvironment?.restore()
  }

  @test
  async 'it should return stored initializer when one is already created'(): Promise<void> {
    const promise = Promise.resolve(StubToKnex(this.StubKnexInstance))
    Imports.Initializer = promise
    expect(await persistance.initialize()).to.equal(this.StubKnexInstance)
    expect(this.StubKnex?.called).to.equal(false)
  }

  @test
  async 'it should set stored Initializer when empty'(): Promise<void> {
    persistance.initialize().catch(() => null)
    expect(await Imports.Initializer).to.equal(this.StubKnexInstance)
  }

  @test
  async 'it should resolve to knex instance'(): Promise<void> {
    const knex = await persistance.initialize()
    expect(knex).to.equal(this.StubKnexInstance)
  }

  @test
  async 'it should pass config to knex initializer'(): Promise<void> {
    await persistance.initialize()
    expect(this.StubKnex?.calledWith(this.FakeEnvironment)).to.equal(true)
  }

  @test
  async 'it should run knex migrations'(): Promise<void> {
    await persistance.initialize()
    expect(this.StubKnexInstance.migrate.latest.called).to.equal(true)
  }
}
