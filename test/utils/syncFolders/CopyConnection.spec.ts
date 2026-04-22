'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { Imports } from '#utils/syncfolders'
import { Cast } from '#testutils/TypeGuards'
import type { Knex } from 'knex'
import type { PoolClient } from 'pg'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function acquireCopyConnection()', () => {
  afterEach(() => {
    sandbox.restore()
  })
  it('should delegate to knex.client.acquireConnection', async () => {
    const acquireStub = sandbox.stub().resolves('THE_CLIENT')
    const knexFake = Cast<Knex>({ client: { acquireConnection: acquireStub } })
    await Imports.acquireCopyConnection(knexFake)
    expect(acquireStub.callCount).to.equal(1)
  })
  it('should return whatever knex.client.acquireConnection resolves with', async () => {
    const expected = { marker: 'pg-client' }
    const knexFake = Cast<Knex>({ client: { acquireConnection: sandbox.stub().resolves(expected) } })
    const result = await Imports.acquireCopyConnection(knexFake)
    expect(result).to.equal(expected)
  })
})

describe('utils/syncfolders function releaseCopyConnection()', () => {
  afterEach(() => {
    sandbox.restore()
  })
  it('should delegate to knex.client.releaseConnection', async () => {
    const releaseStub = sandbox.stub().resolves()
    const knexFake = Cast<Knex>({ client: { releaseConnection: releaseStub } })
    await Imports.releaseCopyConnection(knexFake, Cast<PoolClient>({}))
    expect(releaseStub.callCount).to.equal(1)
  })
  it('should hand back the same client that was acquired', async () => {
    const releaseStub = sandbox.stub().resolves()
    const knexFake = Cast<Knex>({ client: { releaseConnection: releaseStub } })
    const client = Cast<PoolClient>({ marker: 'client' })
    await Imports.releaseCopyConnection(knexFake, client)
    expect(releaseStub.firstCall.args[0]).to.equal(client)
  })
})
