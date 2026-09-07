'use sanity'

import assert from 'node:assert'

import type { MockInstance } from 'vitest'

import { PubSub, type SubscriberFunction, type VoidMethod } from '#public/scripts/app/pubsub.js'
import { cast } from './typeGuards.js'

const LAST_ELEMENT_INDEX = -1
const TOPIC_ARG_INDEX = 0
const HANDLER_ARG_INDEX = 1
const NAME_ARG_INDEX = 0
const INTERVAL_METHOD_ARG_INDEX = 1
const DEFER_METHOD_ARG_INDEX = 0

export function resetPubSub(): void {
  PubSub.subscribers = {}
  PubSub.deferred = []
  PubSub.intervals = {}
  PubSub.timer = undefined
}

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

const GUARD_EXCLUDED_PATHS = [
  '/test/public/app/pubsub/',
  '/test/testutils/pubSub.spec.ts',
  // Verifies pug-template to JS binding, so it needs the live pubsub mechanism.
  '/test/integration/templateContract.spec.ts',
]

export function shouldGuard(testPath: string): boolean {
  return !GUARD_EXCLUDED_PATHS.some((excluded) => testPath.includes(excluded))
}

export function capturedSubscriber(subscribeStub: MockInstance, topic: string): SubscriberFunction {
  const target = topic.toUpperCase()
  const match = subscribeStub.mock.calls
    .filter((c) => typeof c[TOPIC_ARG_INDEX] === 'string' && c[TOPIC_ARG_INDEX].toUpperCase() === target)
    .at(LAST_ELEMENT_INDEX)
  assert(match !== undefined, `No subscribe call captured for topic '${topic}'`)
  return cast<SubscriberFunction>(match[HANDLER_ARG_INDEX])
}

export function publishedData(publishStub: MockInstance, topic: string): unknown {
  const target = topic.toUpperCase()
  const match = publishStub.mock.calls.find(
    (c) => typeof c[TOPIC_ARG_INDEX] === 'string' && c[TOPIC_ARG_INDEX].toUpperCase() === target,
  )
  assert(match !== undefined, `No publish call captured for topic '${topic}'`)
  return match[HANDLER_ARG_INDEX]
}

export function capturedInterval(addIntervalStub: MockInstance, name: string): VoidMethod {
  const match = addIntervalStub.mock.calls.filter((c) => c[NAME_ARG_INDEX] === name).at(LAST_ELEMENT_INDEX)
  assert(match !== undefined, `No addInterval call captured for name '${name}'`)
  return cast<VoidMethod>(match[INTERVAL_METHOD_ARG_INDEX])
}

export function capturedDeferred(deferStub: MockInstance): VoidMethod[] {
  return deferStub.mock.calls.map((c) => cast<VoidMethod>(c[DEFER_METHOD_ARG_INDEX]))
}
