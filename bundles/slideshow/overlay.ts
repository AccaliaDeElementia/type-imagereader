// use sanity

/* global HTMLElement */

import { CyclicUpdater } from './updater'
import { GetAlmanac } from './weather'

const fadein: number = 30 * 60 * 100
const maxOpacity: number = 0.85 // in percent.

const updateOverlay = () => {
  const times = GetAlmanac()
  const now = Date.now()
  let offset = 0
  if (now < times.sunrise) {
    offset = times.sunrise - now
  } else if (now > times.sunset) {
    offset = now - times.sunset
  }
  const overlay = document.querySelector('.overlay') as HTMLElement
  if (overlay) {
    overlay.style.opacity = `${Math.min(maxOpacity * (offset / fadein), maxOpacity)}`
  }
  return Promise.resolve()
}

export default CyclicUpdater.create(updateOverlay, 100)
