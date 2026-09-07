'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Diagnostic, Imports, sendDiagnostic } from '#public/scripts/app/diagnostic.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

interface DiagnosticPayload {
  topic: string
  data: unknown
  ts: number
  ua: string
  clientId: string
}

const MIN_CLIENT_ID_LENGTH = 16

describe('public/app/diagnostic sendDiagnostic()', () => {
  let dom = new JSDOM('', {})
  let postJSONStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM('<html><body></body></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    postJSONStub = vi.spyOn(Imports, 'postJSON').mockResolvedValue(null)
  })
  afterAll(() => {
    unmountDom()
    vi.restoreAllMocks()
  })
  it('should POST to /api/diagnostic', async () => {
    await sendDiagnostic('Some:Topic', {})
    expect(postJSONStub.mock.calls[0]?.[0]).toBe('/api/diagnostic')
  })
  it('should send topic in payload', async () => {
    const topic = `My:Topic:${Math.random()}`
    await sendDiagnostic(topic, {})
    const payload = cast<DiagnosticPayload>(postJSONStub.mock.calls[0]?.[1])
    expect(payload.topic).toBe(topic)
  })
  it('should send data in payload', async () => {
    const data = { value: Math.random(), nested: { x: 'y' } }
    await sendDiagnostic('Topic', data)
    const payload = cast<DiagnosticPayload>(postJSONStub.mock.calls[0]?.[1])
    expect(payload.data).toBe(data)
  })
  it('should send timestamp in payload', async () => {
    const ts = Math.floor(Math.random() * 1_000_000_000)
    const nowStub = vi.spyOn(Date, 'now').mockReturnValue(ts)
    await sendDiagnostic('Topic', {})
    const payload = cast<DiagnosticPayload>(postJSONStub.mock.calls[0]?.[1])
    nowStub.mockRestore()
    expect(payload.ts).toBe(ts)
  })
  it('should send userAgent in payload', async () => {
    await sendDiagnostic('Topic', {})
    const payload = cast<DiagnosticPayload>(postJSONStub.mock.calls[0]?.[1])
    expect(payload.ua).toBe(dom.window.navigator.userAgent)
  })
  it('should send clientId in payload', async () => {
    await sendDiagnostic('Topic', {})
    const payload = cast<DiagnosticPayload>(postJSONStub.mock.calls[0]?.[1])
    expect(payload.clientId).toBe(Diagnostic.clientId)
  })
  it('should use the same clientId across multiple calls', async () => {
    await sendDiagnostic('First', {})
    await sendDiagnostic('Second', {})
    const first = cast<DiagnosticPayload>(postJSONStub.mock.calls[0]?.[1]).clientId
    const second = cast<DiagnosticPayload>(postJSONStub.mock.calls[1]?.[1]).clientId
    expect(first).toBe(second)
  })
  it('should pass an acceptAnyResponse-shaped guard to postJSON', async () => {
    await sendDiagnostic('Topic', {})
    const guard = cast<(o: unknown) => o is unknown>(postJSONStub.mock.calls[0]?.[2])
    expect(guard(null)).toBe(true)
  })
  it('should resolve undefined when postJSON resolves', async () => {
    await expect(sendDiagnostic('Topic', {})).resolves.toBeUndefined()
  })
  it('should not rethrow when postJSON rejects', async () => {
    postJSONStub.mockRejectedValue(new Error('boom'))
    await expect(sendDiagnostic('Topic', {})).resolves.toBeUndefined()
  })
  it('should not report a failed diagnostic as a further diagnostic, which would recurse', async () => {
    postJSONStub.mockRejectedValue(new Error('boom'))
    await sendDiagnostic('Topic', {})
    expect(postJSONStub.mock.calls.length).toBe(1)
  })
})

describe('public/app/diagnostic Diagnostic.clientId', () => {
  it('should be a string', () => {
    expect(typeof Diagnostic.clientId).toBe('string')
  })
  it('should be sufficiently large to avoid collision across tabs', () => {
    expect(Diagnostic.clientId.length >= MIN_CLIENT_ID_LENGTH).toBe(true)
  })
})
