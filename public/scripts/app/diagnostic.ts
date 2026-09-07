'use sanity'

import { postJSON as _postJSON, acceptAnyResponse } from './net.js'

export const Imports = {
  postJSON: _postJSON,
}

export const Diagnostic = {
  clientId: globalThis.crypto.randomUUID(),
}

const REPORTING_A_DIAGNOSTIC_FAILURE_WOULD_RECURSE = undefined

export async function sendDiagnostic(topic: string, data: unknown): Promise<void> {
  try {
    await Imports.postJSON(
      '/api/diagnostic',
      {
        topic,
        data,
        ts: Date.now(),
        ua: window.navigator.userAgent,
        clientId: Diagnostic.clientId,
      },
      acceptAnyResponse,
    )
  } catch {
    return REPORTING_A_DIAGNOSTIC_FAILURE_WOULD_RECURSE
  }
}
