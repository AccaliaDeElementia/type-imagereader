'use sanity'

import { expect } from 'chai'
import { Initialize, Internals, Imports, Persistance, type KnexOptions } from '#utils/persistance.js'
import Sinon from 'sinon'
import { EventuallyRejects } from '#testutils/Errors.js'
import { StubToKnex } from '#testutils/TypeGuards.js'

const sandbox = Sinon.createSandbox()

describe('utils/persistance function Initialize()', () => {
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
    Persistance.Initializer = undefined
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
    stubKnex = sandbox.stub(Imports, 'knex').returns(StubToKnex(stubKnexInstance))
    stubEnvironment = sandbox.stub(Internals, 'GetKnexConfig').resolves(fakeEnvironment)
  })

  afterEach(() => {
    sandbox.restore()
  })
  it('should return stored initializer when one is already created', async () => {
    const promise = Promise.resolve(StubToKnex(stubKnexInstance))
    Persistance.Initializer = promise
    expect(await Initialize()).to.equal(stubKnexInstance)
  })
  it('should not call knex when an initializer is already stored', async () => {
    const promise = Promise.resolve(StubToKnex(stubKnexInstance))
    Persistance.Initializer = promise
    await Initialize()
    expect(stubKnex.called).to.equal(false)
  })
  it('should set stored Initializer when empty', async () => {
    Initialize().catch(() => null)
    expect(await Persistance.Initializer).to.equal(stubKnexInstance)
  })
  it('should resolve to knex instance', async () => {
    const knex = await Initialize()
    expect(knex).to.equal(stubKnexInstance)
  })
  it('should pass config to knex initializer', async () => {
    await Initialize()
    expect(stubKnex.calledWith(fakeEnvironment)).to.equal(true)
  })
  it('should run knex migrations', async () => {
    await Initialize()
    expect(stubKnexInstance.migrate.latest.called).to.equal(true)
  })
  it('should reject when reading config fails', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubEnvironment.rejects(err)
    const result = await EventuallyRejects(Initialize())
    expect(result).to.equal(err)
  })
  it('should reject when reading config throws', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubEnvironment.throws(err)
    const result = await EventuallyRejects(Initialize())
    expect(result).to.equal(err)
  })
  it('should reject when creating Knex  fails', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubKnex.throws(err)
    const result = await EventuallyRejects(Initialize())
    expect(result).to.equal(err)
  })
  it('should reject when migrating to latest fails', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubKnexInstance.migrate.latest.rejects(err)
    const result = await EventuallyRejects(Initialize())
    expect(result).to.equal(err)
  })
  it('should reject when migrating to latest throws', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubKnexInstance.migrate.latest.throws(err)
    const result = await EventuallyRejects(Initialize())
    expect(result).to.equal(err)
  })
})
