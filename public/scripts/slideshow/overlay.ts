'use sanity'

import { CyclicUpdater } from './updater'
import { GetAlmanac } from './weather'

const fadein = 15 * 60 * 1000
const maxOpacity = 0.85 // in percent.

const updateOverlay = async (): Promise<void> => {
  const kioskMode = new URLSearchParams(window.location.search).has('kiosk')
  const overlay = document.querySelector<HTMLElement>('.overlay')

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
  await Promise.resolve()
}

export default new CyclicUpdater(updateOverlay, 100)
