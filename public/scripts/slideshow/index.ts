'use sanity'

import { WebSockets } from './sockets'

import TimeUpdater from './time'
import OverlayUpdater from './overlay'
import { WeatherUpdater, LocalWeatherUpdater } from './weather'
import { CyclicManager } from './updater'

CyclicManager.Add(TimeUpdater, OverlayUpdater, WeatherUpdater, LocalWeatherUpdater)
CyclicManager.Start(100)

WebSockets.connect()
