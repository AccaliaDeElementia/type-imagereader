'use sanity'

import { expect } from 'chai'
import { FormatSyncItemCsv } from '#sync/helpers.js'

const baseRow = {
  folder: '/',
  path: '/foo.jpg',
  isFile: true,
  sortKey: 'foo',
  pathHash: 'abc123',
}

describe('sync/helpers FormatSyncItemCsv()', () => {
  it('should terminate the row with a newline', () => {
    expect(FormatSyncItemCsv(baseRow).endsWith('\n')).to.equal(true)
  })
  it('should emit exactly one newline per row', () => {
    expect(FormatSyncItemCsv(baseRow).split('\n')).to.have.lengthOf(2)
  })
  it('should wrap the folder field in double quotes', () => {
    const parts = FormatSyncItemCsv(baseRow).trim().split(',')
    expect(parts[0]).to.equal('"/"')
  })
  it('should wrap the path field in double quotes', () => {
    const parts = FormatSyncItemCsv(baseRow).trim().split(',')
    expect(parts[1]).to.equal('"/foo.jpg"')
  })
  it('should emit t for isFile true', () => {
    const parts = FormatSyncItemCsv(baseRow).trim().split(',')
    expect(parts[2]).to.equal('t')
  })
  it('should emit f for isFile false', () => {
    const parts = FormatSyncItemCsv({ ...baseRow, isFile: false })
      .trim()
      .split(',')
    expect(parts[2]).to.equal('f')
  })
  it('should wrap the sortKey field in double quotes', () => {
    const parts = FormatSyncItemCsv(baseRow).trim().split(',')
    expect(parts[3]).to.equal('"foo"')
  })
  it('should wrap the pathHash field in double quotes', () => {
    const parts = FormatSyncItemCsv(baseRow).trim().split(',')
    expect(parts[4]).to.equal('"abc123"')
  })
  it('should double inner double quotes when they appear in the folder', () => {
    const row = { ...baseRow, folder: '/pre"fix/' }
    expect(FormatSyncItemCsv(row)).to.include('"/pre""fix/"')
  })
  it('should double inner double quotes when they appear in the path', () => {
    const row = { ...baseRow, path: '/a"b.jpg' }
    expect(FormatSyncItemCsv(row)).to.include('"/a""b.jpg"')
  })
  it('should preserve commas inside quoted fields without extra escaping', () => {
    const row = { ...baseRow, path: '/a,b.jpg' }
    expect(FormatSyncItemCsv(row)).to.include('"/a,b.jpg"')
  })
})
