'use sanity'

import { PubSub } from '#public/scripts/app/pubsub.js'

export function resetPubSub(): void {
  PubSub.subscribers = {}
  PubSub.deferred = []
  PubSub.intervals = {}
  PubSub.timer = undefined
}
