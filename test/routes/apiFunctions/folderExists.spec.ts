'use sanity'

import { folderExists } from '#routes/apiFunctions.js'
import { createKnexChainFake } from '#testutils/knex.js'

describe('routes/apiFunctions folderExists', () => {
  let {
    instance: knexInstance,
    stub: knexStub,
    fake: knexFake,
  } = createKnexChainFake(['select', 'where'] as const, ['first'] as const)
  beforeEach(() => {
    ;({
      instance: knexInstance,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['select', 'where'] as const, ['first'] as const))
    knexInstance.first.mockResolvedValue(undefined)
  })
  it('should select from the folders table', async () => {
    await folderExists(knexFake, '/foo/')
    expect(knexStub.mock.calls[0]).toEqual(['folders'])
  })
  it('should select only the path column', async () => {
    await folderExists(knexFake, '/foo/')
    expect(knexInstance.select.mock.calls[0]).toEqual(['path'])
  })
  it('should filter by exact path match', async () => {
    await folderExists(knexFake, '/foo/')
    expect(knexInstance.where.mock.calls[0]).toEqual(['path', '=', '/foo/'])
  })
  it('should return false when first() resolves undefined', async () => {
    expect(await folderExists(knexFake, '/foo/')).toBe(false)
  })
  it('should return true when first() resolves a row', async () => {
    knexInstance.first.mockResolvedValue({ path: '/foo/' })
    expect(await folderExists(knexFake, '/foo/')).toBe(true)
  })
})
