'use sanity'

import { expect } from 'chai'
import persistance, { Functions, Imports, type KnexOptions } from '../../../utils/persistance'
import Sinon from 'sinon'
import { EventuallyRejects } from '../../testutils/Errors'
import { StubToKnex } from '../../testutils/TypeGuards'

describe('utils/persistance function initialize()', () => {
  let fakeEnvironment: KnexOptions = {
    client: 'fakeClient',
    connection: {
      host: 'fake host',
    },
    migrations: {
      tableName: 'migrations tablename',
    },
  }
  let stubEnvironment = Sinon.stub()
  let stubKnex = Sinon.stub()
  let stubKnexInstance = {
    migrate: {
      latest: Sinon.stub().resolves(),
    },
  }

  beforeEach(() => {
    Imports.Initializer = undefined
    fakeEnvironment = {
      client: 'fakeClient',
      connection: {
        host: 'fake host',
      },
      migrations: {
        tableName: 'migrations tablename',
      },
    }
    stubKnexInstance = {
      migrate: {
        latest: Sinon.stub().resolves(),
      },
    }
    stubKnex = Sinon.stub(Imports, 'knex').returns(StubToKnex(stubKnexInstance))
    stubEnvironment = Sinon.stub(Functions, 'getKnexConfig').resolves(fakeEnvironment)
  })

  afterEach(() => {
    stubKnex.restore()
    stubEnvironment.restore()
  })
  it('should return stored initializer when one is already created', async () => {
    const promise = Promise.resolve(StubToKnex(stubKnexInstance))
    Imports.Initializer = promise
    expect(await persistance.initialize()).to.equal(stubKnexInstance)
    expect(stubKnex.called).to.equal(false)
  })
  it('should set stored Initializer when empty', async () => {
    persistance.initialize().catch(() => null)
    expect(await Imports.Initializer).to.equal(stubKnexInstance)
  })
  it('should resolve to knex instance', async () => {
    const knex = await persistance.initialize()
    expect(knex).to.equal(stubKnexInstance)
  })
  it('should pass config to knex initializer', async () => {
    await persistance.initialize()
    expect(stubKnex.calledWith(fakeEnvironment)).to.equal(true)
  })
  it('should run knex migrations', async () => {
    await persistance.initialize()
    expect(stubKnexInstance.migrate.latest.called).to.equal(true)
  })
  it('should reject when reading config fails', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubEnvironment.rejects(err)
    const result = await EventuallyRejects(persistance.initialize())
    expect(result).to.equal(err)
  })
  it('should reject when reading config throws', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubEnvironment.throws(err)
    const result = await EventuallyRejects(persistance.initialize())
    expect(result).to.equal(err)
  })
  it('should reject when creating Knex  fails', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubKnex.throws(err)
    const result = await EventuallyRejects(persistance.initialize())
    expect(result).to.equal(err)
  })
  it('should reject when migrating to latest fails', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubKnexInstance.migrate.latest.rejects(err)
    const result = await EventuallyRejects(persistance.initialize())
    expect(result).to.equal(err)
  })
  it('should reject when migrating to latest throws', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubKnexInstance.migrate.latest.throws(err)
    const result = await EventuallyRejects(persistance.initialize())
    expect(result).to.equal(err)
  })
})
