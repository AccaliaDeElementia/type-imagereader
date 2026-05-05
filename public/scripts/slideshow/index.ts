'use sanity'

import { WebSockets } from './sockets.js'

import TimeUpdater from './time.js'
import OverlayUpdater from './overlay.js'
import { WeatherUpdater, LocalWeatherUpdater } from './weather.js'
import { CyclicManager } from './updater.js'

const UPDATE_INTERVAL = 100 // ms

export function bootstrap(): void {
  CyclicManager.Add(TimeUpdater, OverlayUpdater, WeatherUpdater, LocalWeatherUpdater)
  CyclicManager.Start(UPDATE_INTERVAL)
  WebSockets.connect()
}
