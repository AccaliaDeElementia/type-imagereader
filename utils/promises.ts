'use sanity'

import type { Debugger } from 'debug'

// Attach a rejection handler that logs (message, err) and consumes the rejection.
// Use for fire-and-forget promises whose only failure mode is "log it and move on"
// — e.g., socket-event callbacks, scheduled tasks.
export function catchLog<T>(promise: Promise<T>, logger: Debugger, message: string): void {
  promise.catch((err: unknown) => {
    logger(message, err)
  })
}
