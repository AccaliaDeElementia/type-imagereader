'use sanity'

import { pruneEmptyFolders, Imports, LOG_PREFIX } from '#sync/folderCounts.js'
import { createKnexChainFake } from '#testutils/knex.js'
import { stubDebug } from '#testutils/debug.js'
import type { MockInstance } from 'vitest'

describe('sync/folderCounts pruneEmptyFolders()', () => {
  let loggerStub: MockInstance = vi.fn()
  let debugStub: MockInstance = vi.fn()
  let {
    instance: knexStub,
    stub: knexFnStub,
    fake: knexFnFake,
  } = createKnexChainFake(['where', 'andWhere'] as const, ['delete'] as const, undefined)
  beforeEach(() => {
    ;({
      instance: knexStub,
      stub: knexFnStub,
      fake: knexFnFake,
    } = createKnexChainFake(['where', 'andWhere'] as const, ['delete'] as const, undefined))
    ;({ debugStub, loggerStub } = stubDebug(Imports))
  })
  it('should call debug once when constructing logger', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(debugStub.mock.calls.length).toBe(1)
  })
  it('should construct prefixed logger', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(debugStub.mock.calls[0]?.[0]).toSatisfy(
      (msg: unknown): msg is string =>
        typeof msg === 'string' && msg.startsWith(`${LOG_PREFIX}:`) && msg.endsWith(':pruneEmpty'),
    )
  })
  it('should call knex once when deleting empty folders', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexFnStub.mock.calls.length).toBe(1)
  })
  it('should delete from folders table', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexFnStub.mock.calls[0]).toEqual(['folders'])
  })
  it('should call where once when filtering empty folders', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexStub.where.mock.calls.length).toBe(1)
  })
  it('should filter folders with totalCount=0', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexStub.where.mock.calls[0]).toEqual(['totalCount', '=', 0])
  })
  it('should call andWhere once when excluding root', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexStub.andWhere.mock.calls.length).toBe(1)
  })
  it('should exclude root folder from prune delete', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexStub.andWhere.mock.calls[0]).toEqual(['path', '<>', '/'])
  })
  it('should call delete once', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexStub.delete.mock.calls.length).toBe(1)
  })
  it('should delete with no arguments', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexStub.delete.mock.calls[0]).toEqual([])
  })
  it('should log removed folder count once', async () => {
    knexStub.delete.mockResolvedValue(42)
    await pruneEmptyFolders(knexFnFake)
    expect(loggerStub.mock.calls.length).toBe(1)
  })
  it('should log removed folder count', async () => {
    knexStub.delete.mockResolvedValue(42)
    await pruneEmptyFolders(knexFnFake)
    expect(loggerStub.mock.calls[0]).toEqual(['Removed 42 empty folders'])
  })
})
