'use sanity'

import { expect } from 'chai'
import { UriSafePath } from '../../../routes/apiFunctions'

describe('routes/apiFunctions UriSafePath functions', () => {
  it('decode() it should accept empty string', () => {
    expect(UriSafePath.decode('')).to.equal('')
  })
  it('decode() it should accept raw string', () => {
    expect(UriSafePath.decode('/foo/bar')).to.equal('/foo/bar')
  })
  it('decode() it should accept encoded string', () => {
    expect(UriSafePath.decode('/%66%6F%6F/%62%61%72')).to.equal('/foo/bar')
  })
  it('encodeNullable() it should accept null string', () => {
    expect(UriSafePath.encodeNullable(null)).to.equal(null)
  })
  it('encodeNullable() it should accept empty string', () => {
    expect(UriSafePath.encodeNullable('')).to.equal(null)
  })
  it('encodeNUllable() it should accept string with encoding', () => {
    expect(UriSafePath.encodeNullable('/,foo=/<bar>')).to.equal('/%2Cfoo%3D/%3Cbar%3E')
  })
  it('encode() it should accept empty string', () => {
    expect(UriSafePath.encode('')).to.equal('')
  })
  it('encode() it should accept string with encoding', () => {
    expect(UriSafePath.encode('/,foo=/<bar>')).to.equal('/%2Cfoo%3D/%3Cbar%3E')
  })
})
