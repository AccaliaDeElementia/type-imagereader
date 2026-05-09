'use sanity'

import { Connect as _SocketsConnect } from './sockets.js'

import { TimeUpdater } from './time.js'
import { OverlayUpdater } from './overlay.js'
import { WeatherUpdater, LocalWeatherUpdater } from './weather.js'
import { Add as _CyclicManagerAdd, start as _CyclicManagerStart } from './updater.js'

const UPDATE_INTERVAL = 100 // ms

export const Imports = {
  CyclicManagerAdd: _CyclicManagerAdd,
  CyclicManagerStart: _CyclicManagerStart,
  SocketsConnect: _SocketsConnect,
}

export function bootstrap(): void {
  Imports.CyclicManagerAdd(TimeUpdater, OverlayUpdater, WeatherUpdater, LocalWeatherUpdater)
  Imports.CyclicManagerStart(UPDATE_INTERVAL)
  Imports.SocketsConnect()
}
