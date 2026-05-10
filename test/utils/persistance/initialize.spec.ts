'use sanity'

import { initialize, Internals, Imports, Persistance, type KnexOptions } from '#utils/persistance.js'
import Sinon from 'sinon'
import { eventuallyRejects } from '#testutils/errors.js'
import { stubToKnex } from '#testutils/typeGuards.js'

const sandbox = Sinon.createSandbox()

describe('utils/persistance initialize()', () => {
  let fakeEnvironment: KnexOptions = {
    client: 'fakeClient',
    connection: {
      host: 'fake host',
    },
    migrations: {
      tableName: 'migrations tablename',
    },
  }
  let stubEnvironment = sandbox.stub()
  let stubKnex = sandbox.stub()
  let stubKnexInstance = {
    migrate: {
      latest: sandbox.stub().resolves(),
    },
  }

  beforeEach(() => {
    Persistance.initializer = undefined
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
        latest: sandbox.stub().resolves(),
      },
    }
    stubKnex = sandbox.stub(Imports, 'knex').returns(stubToKnex(stubKnexInstance))
    stubEnvironment = sandbox.stub(Internals, 'getKnexConfig').resolves(fakeEnvironment)
  })

  afterEach(() => {
    sandbox.restore()
  })
  it('should return stored initializer when one is already created', async () => {
    const promise = Promise.resolve(stubToKnex(stubKnexInstance))
    Persistance.initializer = promise
    expect(await initialize()).toBe(stubKnexInstance)
  })
  it('should not call knex when an initializer is already stored', async () => {
    const promise = Promise.resolve(stubToKnex(stubKnexInstance))
    Persistance.initializer = promise
    await initialize()
    expect(stubKnex.called).toBe(false)
  })
  it('should set stored Initializer when empty', async () => {
    initialize().catch(() => null)
    expect(await Persistance.initializer).toBe(stubKnexInstance)
  })
  it('should resolve to knex instance', async () => {
    const knex = await initialize()
    expect(knex).toBe(stubKnexInstance)
  })
  it('should pass config to knex initializer', async () => {
    await initialize()
    expect(stubKnex.calledWith(fakeEnvironment)).toBe(true)
  })
  it('should run knex migrations', async () => {
    await initialize()
    expect(stubKnexInstance.migrate.latest.called).toBe(true)
  })
  it('should reject when reading config fails', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubEnvironment.rejects(err)
    const result = await eventuallyRejects(initialize())
    expect(result).toBe(err)
  })
  it('should reject when reading config throws', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubEnvironment.throws(err)
    const result = await eventuallyRejects(initialize())
    expect(result).toBe(err)
  })
  it('should reject when creating Knex  fails', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubKnex.throws(err)
    const result = await eventuallyRejects(initialize())
    expect(result).toBe(err)
  })
  it('should reject when migrating to latest fails', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubKnexInstance.migrate.latest.rejects(err)
    const result = await eventuallyRejects(initialize())
    expect(result).toBe(err)
  })
  it('should reject when migrating to latest throws', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubKnexInstance.migrate.latest.throws(err)
    const result = await eventuallyRejects(initialize())
    expect(result).toBe(err)
  })
})
