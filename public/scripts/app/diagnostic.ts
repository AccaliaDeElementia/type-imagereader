'use sanity'

import { postJSON as _postJSON, acceptAnyResponse } from './net.js'

export const Imports = {
  postJSON: _postJSON,
}

export const Diagnostic = {
  clientId: globalThis.crypto.randomUUID(),
}

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
    // swallow: diagnostic transport failures must not loop back into the diagnostic pipeline
  }
}
