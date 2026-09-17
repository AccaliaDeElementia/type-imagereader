'use sanity'

import { afterEach } from 'vitest'

import { restoreRealTimersAndFailOnLeak } from './timerGuard.js'

afterEach(restoreRealTimersAndFailOnLeak)
