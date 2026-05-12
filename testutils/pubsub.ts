'use sanity'

import assert from 'node:assert'

import type Sinon from 'sinon'

import { PubSub, type SubscriberFunction } from '#public/scripts/app/pubsub.js'
import { cast } from './typeGuards.js'

const LAST_ELEMENT_INDEX = -1
const TOPIC_ARG_INDEX = 0
const HANDLER_ARG_INDEX = 1

export function resetPubSub(): void {
  PubSub.subscribers = {}
  PubSub.deferred = []
  PubSub.intervals = {}
  PubSub.timer = undefined
}

// Return the handler function from the most-recent call on `subscribeStub`
// matching `topic` (case-insensitive). Used by specs that stub `Imports.subscribe`
// to capture and invoke the SUT-registered handler. Asserts loudly if no
// matching call exists.
export function capturedSubscriber(subscribeStub: Sinon.SinonStub, topic: string): SubscriberFunction {
  const target = topic.toUpperCase()
  const match = subscribeStub
    .getCalls()
    .filter((c) => typeof c.args[TOPIC_ARG_INDEX] === 'string' && c.args[TOPIC_ARG_INDEX].toUpperCase() === target)
    .at(LAST_ELEMENT_INDEX)
  assert(match !== undefined, `No subscribe call captured for topic '${topic}'`)
  return cast<SubscriberFunction>(match.args[HANDLER_ARG_INDEX])
}
