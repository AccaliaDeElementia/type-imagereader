'use sanity'
import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { Knex } from 'knex'
import persistance, { Functions, Imports } from '../../utils/persistance'

@suite
export class PersistanceGetEnvironmentNameTests {
  @test
  'it should choose `development` when environment DB_CLIENT is not set' () {
    delete process.env.DB_CLIENT
    expect(Functions.EnvironmentName).to.equal('development')
  }

  @test
  'it should choose `development` when environment DB_CLIENT is blank' () {
    process.env.DB_CLIENT = ''
    expect(Functions.EnvironmentName).to.equal('development')
  }

  @test
  'it should choose DB_CLIENT when set' () {
    process.env.DB_CLIENT = 'FOO ENV'
    expect(Functions.EnvironmentName).to.equal('FOO ENV')
  }
}

@suite
export class PersistanceGetEnvironmentTests {
  before () {
    process.env.DB_CLIENT = 'postgresql'
    delete process.env.DB_HOST
    delete process.env.DB_DATABASE
    delete process.env.DB_USER
    delete process.env.DB_PASSWORD
    delete process.env.DB_FILENAME
  }

  @test
  'it should pick the postgres environment for testing' () {
    expect(Functions.Environment.client).to.equal('postgresql')
  }

  @test
  'it should use default value of connection host when environment not set' () {
    expect(Functions.Environment.connection.host).to.equal('postgres')
  }

  @test
  'it should use environment value of connection host when set' () {
    process.env.DB_HOST = 'foo bar baz'
    expect(Functions.Environment.connection.host).to.equal('foo bar baz')
  }

  @test
  'it should use default value of connection database when environment not set' () {
    expect(Functions.Environment.connection.database).to.equal('postgres')
  }

  @test
  'it should use environment value of connection database when set' () {
    process.env.DB_DATABASE = 'foo bar baz'
    expect(Functions.Environment.connection.database).to.equal('foo bar baz')
  }

  @test
  'it should use default value of connection user when environment not set' () {
    expect(Functions.Environment.connection.user).to.equal('postgres')
  }

  @test
  'it should use environment value of connection user when set' () {
    process.env.DB_USER = 'foo bar baz'
    expect(Functions.Environment.connection.user).to.equal('foo bar baz')
  }

  @test
  'it should use default value of connection password when environment not set' () {
    expect(Functions.Environment.connection.password).to.equal('password')
  }

  @test
  'it should use environment value of connection password when set' () {
    process.env.DB_PASSWORD = 'foo bar baz'
    expect(Functions.Environment.connection.password).to.equal('foo bar baz')
  }

  @test
  'it should use default value of connection filename when environment not set' () {
    expect(Functions.Environment.connection.filename).to.equal(undefined)
  }

  @test
  'it should use environment value of connection filename when set' () {
    process.env.DB_FILENAME = 'foo bar baz'
    expect(Functions.Environment.connection.filename).to.equal('foo bar baz')
  }
}

@suite
export class PersistanceInitializeTests {
  FakeEnvironment = {}
  StubEnvironment?: Sinon.SinonStub
  StubKnex?: Sinon.SinonStub
  StubKnexInstance = {
    migrate: {
      latest: sinon.stub().resolves()
    }
  }

  before () {
    Imports.Initializer = undefined
    this.StubKnex = sinon.stub(Imports, 'knex').returns(this.StubKnexInstance)
    this.StubEnvironment = sinon.stub(Functions, 'Environment').get(() => this.FakeEnvironment)
  }

  after () {
    this.StubKnex?.restore()
    this.StubEnvironment?.restore()
  }

  @test
  'it should return stored initializer when one is already created' () {
    const promise = Promise.resolve(this.StubKnexInstance as unknown as Knex)
    Imports.Initializer = promise
    expect(persistance.initialize()).to.equal(promise)
    expect(this.StubKnex?.called).to.equal(false)
  }

  @test
  'it should set stored Initializer when empty' () {
    const promise = persistance.initialize()
    expect(Imports.Initializer).to.equal(promise)
  }

  @test
  async 'it should resolve to knex instance' () {
    const knex = await persistance.initialize()
    expect(knex).to.equal(this.StubKnexInstance)
  }

  @test
  async 'it should pass config to knex initializer' () {
    await persistance.initialize()
    expect(this.StubKnex?.calledWith(this.FakeEnvironment)).to.equal(true)
  }

  @test
  async 'it should run knex migrations' () {
    await persistance.initialize()
    expect(this.StubKnexInstance.migrate.latest.called).to.equal(true)
  }
}
