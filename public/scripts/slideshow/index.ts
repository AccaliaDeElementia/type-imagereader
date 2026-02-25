'use sanity'

import { WebSockets } from './sockets'

import TimeUpdater from './time'
import OverlayUpdater from './overlay'
import { WeatherUpdater, LocalWeatherUpdater } from './weather'
import { CyclicManager } from './updater'

const UPDATE_INTERVAL = 100 // ms

CyclicManager.Add(TimeUpdater, OverlayUpdater, WeatherUpdater, LocalWeatherUpdater)
CyclicManager.Start(UPDATE_INTERVAL)

WebSockets.connect()
