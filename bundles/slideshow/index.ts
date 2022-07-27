// use sanity

import './sockets'

import TimeUpdater from './time'
import OverlayUpdater from './overlay'
import { WeatherUpdater, LocalWeatherUpdater } from './weather'
import { StartCycling, AddUpdater } from './updater'

AddUpdater(TimeUpdater, OverlayUpdater, WeatherUpdater, LocalWeatherUpdater)
StartCycling(100)
