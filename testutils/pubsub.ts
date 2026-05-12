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

// Install a guardCallback on the real PubSub that throws if bare
// subscribe/publish/forward are invoked. Used to catch tests that let real
// pubsub primitives leak — those calls should go through `Imports.*` stubs.
// Pair with `unmountPubSub()` in afterEach to restore.
export function mountPubSub(): void {
  PubSub.guardCallback = (op) => {
    throw new Error(
      `Bare pubsub ${op} called during test — SUT should go through Imports.* (call site likely missing a stub)`,
    )
  }
}

export function unmountPubSub(): void {
  PubSub.guardCallback = undefined
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

// Return the data arg of the first call on `publishStub` matching `topic`
// (case-insensitive). Used by specs that stub `Imports.publish` to assert
// the payload of a specific publish. Asserts loudly if no matching call exists.
export function publishedData(publishStub: Sinon.SinonStub, topic: string): unknown {
  const target = topic.toUpperCase()
  const match = publishStub
    .getCalls()
    .find((c) => typeof c.args[TOPIC_ARG_INDEX] === 'string' && c.args[TOPIC_ARG_INDEX].toUpperCase() === target)
  assert(match !== undefined, `No publish call captured for topic '${topic}'`)
  return match.args[HANDLER_ARG_INDEX]
}
