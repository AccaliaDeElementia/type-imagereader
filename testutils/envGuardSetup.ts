'use sanity'

import { afterAll, beforeEach } from 'vitest'

import { snapshotProcessEnv } from './envGuard.js'

afterAll(snapshotProcessEnv())

beforeEach(snapshotProcessEnv)
