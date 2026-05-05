'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { EventEmitter } from 'node:events'

import { FindSyncItemsViaCopy, type CopyHelpers } from '#utils/syncItemsDialect.js'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import type { Debugger } from 'debug'
import type { CopyStreamQuery } from 'pg-copy-streams'
import type { PoolClient } from 'pg'

const sandbox = Sinon.createSandbox()
const noopLogger = Cast<Debugger>(() => undefined)

const FILE_COUNT = 4
const DIR_COUNT = 1

const buildStream = (): CopyStreamQuery => {
  const stream = new EventEmitter()
  Object.assign(stream, {
    write: () => true,
    end: () => {
      setImmediate(() => {
        stream.emit('finish')
      })
    },
    destroy: () => undefined,
  })
  return Cast<CopyStreamQuery>(stream)
}

const buildHelpers = (overrides: Partial<CopyHelpers> = {}): CopyHelpers => ({
  fsWalker: async (_root, cb) => {
    await cb([], 0)
  },
  buildSyncItemRows: () => ({
    files: FILE_COUNT,
    dirs: DIR_COUNT,
    rows: [{ folder: '', path: '/x', sortKey: 'x', isFile: true, pathHash: 'h' }],
  }),
  getDataDir: () => '/',
  formatSyncItemCsv: () => 'csv-row\n',
  copyFrom: () => buildStream(),
  acquireCopyConnection: async () => {
    await Promise.resolve()
    return Cast<PoolClient>({ query: (s: CopyStreamQuery) => s })
  },
  releaseCopyConnection: async () => {
    await Promise.resolve()
  },
  ...overrides,
})

describe('utils/syncItemsDialect function FindSyncItemsViaCopy()', () => {
  afterEach(() => {
    sandbox.restore()
  })

  it('should return aggregated counts from buildSyncItemRows', async () => {
    const knex = StubToKnex(sandbox.stub())
    const result = await FindSyncItemsViaCopy(knex, noopLogger, buildHelpers())
    expect(result).to.deep.equal({ files: FILE_COUNT, dirs: DIR_COUNT })
  })

  it('should release the copy connection after streaming completes', async () => {
    const releaseSpy = sandbox.stub().resolves()
    const knex = StubToKnex(sandbox.stub())
    await FindSyncItemsViaCopy(knex, noopLogger, buildHelpers({ releaseCopyConnection: releaseSpy }))
    expect(releaseSpy.callCount).to.equal(1)
  })
})
