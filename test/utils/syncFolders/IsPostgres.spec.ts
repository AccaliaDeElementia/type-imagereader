'use sanity'

import { describe, it } from 'mocha'
import { expect } from 'chai'
import type { Knex } from 'knex'
import { IsPostgres } from '#utils/syncItemsDialect'
import { Cast } from '#testutils/TypeGuards'

const fakeKnex = (clientName: string): Knex => Cast<Knex>({ client: { config: { client: clientName } } })

describe('utils/syncItemsDialect function IsPostgres()', () => {
  it('should return true when client is postgresql', () => {
    expect(IsPostgres(fakeKnex('postgresql'))).to.equal(true)
  })

  it('should return true when client is pg', () => {
    expect(IsPostgres(fakeKnex('pg'))).to.equal(true)
  })

  it('should return false when client is sqlite3', () => {
    expect(IsPostgres(fakeKnex('sqlite3'))).to.equal(false)
  })

  it('should return false when client is better-sqlite3', () => {
    expect(IsPostgres(fakeKnex('better-sqlite3'))).to.equal(false)
  })

  it('should return false when client is mysql', () => {
    expect(IsPostgres(fakeKnex('mysql'))).to.equal(false)
  })
})
