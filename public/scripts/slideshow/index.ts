'use sanity'

import { WebSockets } from './sockets'

import TimeUpdater from './time'
import OverlayUpdater from './overlay'
import { WeatherUpdater, LocalWeatherUpdater } from './weather'
import { CyclicManager } from './updater'

// This is code that can't be easily tested automatically
// ...yet.
// istanbul ignore next
CyclicManager.Add(TimeUpdater, OverlayUpdater, WeatherUpdater, LocalWeatherUpdater)
// istanbul ignore next
CyclicManager.Start(100)

// istanbul ignore next
WebSockets.connect()
