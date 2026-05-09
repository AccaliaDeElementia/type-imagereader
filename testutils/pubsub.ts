'use sanity'

import assert from 'node:assert'

import { PubSub, type SubscriberFunction } from '#public/scripts/app/pubsub.js'

const LAST_ELEMENT_INDEX = -1

export function resetPubSub(): void {
  PubSub.subscribers = {}
  PubSub.deferred = []
  PubSub.intervals = {}
  PubSub.timer = undefined
}

// Return the most-recently-registered subscriber for `topic` so a test can
// invoke it directly (e.g. to verify how the registered handler reacts to
// crafted input). Asserts that at least one subscriber exists — fails the
// test loudly with the topic name in the message when the SUT didn't
// register what was expected. Non-destructive: the registry is unchanged
// after retrieval.
export function getSubscriber(topic: string): SubscriberFunction {
  const list = PubSub.subscribers[topic.toUpperCase()] ?? []
  const last = list.at(LAST_ELEMENT_INDEX)
  assert(last !== undefined, `No subscriber registered for topic '${topic}'`)
  return last
}
