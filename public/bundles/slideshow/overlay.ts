// use sanity

/* global HTMLElement */

import { CyclicUpdater } from './updater'
import { GetAlmanac } from './weather'

const fadein: number = 30 * 60 * 100
const maxOpacity: number = 0.75 // in percent.

const kioskMode = new URLSearchParams(window.location.search).has('kiosk')
const overlay = document.querySelector('.overlay') as HTMLElement

const updateOverlay = () => {
  if (!kioskMode) return
  const times = GetAlmanac()
  const now = Date.now()
  let offset = 0
  if (now < times.sunrise) {
    offset = times.sunrise - now
  } else if (now > times.sunset) {
    offset = now - times.sunset
  }
  if (overlay) {
    overlay.style.opacity = `${Math.min(maxOpacity * (offset / fadein), maxOpacity)}`
  }
  return Promise.resolve()
}

if (kioskMode && overlay) {
  overlay.classList.remove('hide')

  for (const elem of document.querySelectorAll('.pixel')) {
    elem.classList.remove('hide')
  }
}

export default CyclicUpdater.create(updateOverlay, 100)
