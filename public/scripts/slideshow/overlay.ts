'use sanity'

import { CyclicUpdater } from './updater'
import { GetAlmanac } from './weather'

const fadein = 15 * 60 * 1000
const maxOpacity = 0.95 // in percent.

export const Functions = {
  GetOpacity: (offsetMs: number): number => {
    if (offsetMs < 0) return 0
    return Math.min(maxOpacity * (offsetMs / fadein), maxOpacity)
  },
  ShowHideKiosk: (overlay: HTMLElement, isKioskMode: boolean): void => {
    if (isKioskMode) {
      overlay.classList.add('hide')
    } else {
      overlay.classList.remove('hide')
    }
  },
  CalculateOffset: (): number => {
    const times = GetAlmanac()
    const now = Date.now()
    if (now < times.sunrise) {
      return times.sunrise - now
    } else if (now > times.sunset) {
      return now - times.sunset
    }
    return 0
  },
}

const updateOverlay = async (): Promise<void> => {
  const kioskMode = new URLSearchParams(window.location.search).has('kiosk')
  const overlay = document.querySelector<HTMLElement>('.overlay')
  if (overlay == null) return
  Functions.ShowHideKiosk(overlay, kioskMode)
  const offset = Functions.CalculateOffset()
  overlay.style.setProperty('opacity', `${Functions.GetOpacity(offset)}`)
  await Promise.resolve()
}

export default new CyclicUpdater(updateOverlay, 100)
