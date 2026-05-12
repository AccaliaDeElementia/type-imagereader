'use sanity'

import { afterEach, beforeEach, expect } from 'vitest'

import { mountPubSub, shouldGuard, unmountPubSub } from './pubsub.js'
import { cast } from './typeGuards.js'

beforeEach(() => {
  if (shouldGuard(cast<string>(expect.getState().testPath))) {
    mountPubSub()
  }
})

afterEach(() => {
  unmountPubSub()
})
