'use sanity'

import { CyclicUpdater } from './updater'
import { GetAlmanac } from './weather'

const fadein: number = 30 * 60 * 1000
const maxOpacity: number = 0.75 // in percent.

const updateOverlay = async () => {
  const kioskMode = new URLSearchParams(window.location.search).has('kiosk')
  const overlay = document.querySelector('.overlay') as HTMLElement|null

  if (!kioskMode) return
  overlay?.classList.remove('hide')

  for (const elem of document.querySelectorAll('.pixel')) {
    elem.classList.remove('hide')
  }
  const times = GetAlmanac()
  const now = Date.now()
  let offset = 0
  if (now < times.sunrise) {
    offset = times.sunrise - now
  } else if (now > times.sunset) {
    offset = now - times.sunset
  }
  overlay?.style.setProperty('opacity', `${Math.min(maxOpacity * (offset / fadein), maxOpacity)}`)
  return Promise.resolve()
}

export default CyclicUpdater.create(updateOverlay, 100)
