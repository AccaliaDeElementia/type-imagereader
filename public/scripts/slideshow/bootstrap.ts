'use sanity'

import { connect as _socketsConnect } from './sockets.js'

import { timeUpdater } from './time.js'
import { overlayUpdater } from './overlay.js'
import { weatherUpdater, localWeatherUpdater } from './weather.js'
import { add as _cyclicManagerAdd, start as _cyclicManagerStart } from './updater.js'

const UPDATE_INTERVAL_MS = 100

export const Imports = {
  cyclicManagerAdd: _cyclicManagerAdd,
  cyclicManagerStart: _cyclicManagerStart,
  socketsConnect: _socketsConnect,
}

export function bootstrap(): void {
  Imports.cyclicManagerAdd(timeUpdater, overlayUpdater, weatherUpdater, localWeatherUpdater)
  Imports.cyclicManagerStart(UPDATE_INTERVAL_MS)
  Imports.socketsConnect()
}
