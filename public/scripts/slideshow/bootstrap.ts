'use sanity'

import { connect as _socketsConnect } from './sockets.js'

import { timeUpdater } from './time.js'
import { overlayUpdater } from './overlay.js'
import { weatherUpdater, localWeatherUpdater } from './weather.js'
import { add as _cyclicManagerAdd, start as _cyclicManagerStart } from './updater.js'

const UPDATE_INTERVAL = 100 // ms

export const Imports = {
  cyclicManagerAdd: _cyclicManagerAdd,
  cyclicManagerStart: _cyclicManagerStart,
  socketsConnect: _socketsConnect,
}

export function bootstrap(): void {
  Imports.cyclicManagerAdd(timeUpdater, overlayUpdater, weatherUpdater, localWeatherUpdater)
  Imports.cyclicManagerStart(UPDATE_INTERVAL)
  Imports.socketsConnect()
}
