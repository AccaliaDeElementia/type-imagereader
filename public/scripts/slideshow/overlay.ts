'use sanity'

import { CyclicUpdater } from './updater'
import { GetAlmanac } from './weather'

const FADE_IN_TIME = 900_000 // 15 minutes
const MAX_OPACITY = 0.95 // in percent.
const MIN_OPACITY = 0
const MIN_OFFSET = 0
const UPDATE_INTERVAL = 100
export const Functions = {
  GetOpacity: (offsetMs: number): number => {
    if (offsetMs < MIN_OFFSET) return MIN_OPACITY
    return Math.min(MAX_OPACITY * (offsetMs / FADE_IN_TIME), MAX_OPACITY)
  },
  ShowHideKiosk: (overlay: HTMLElement, isKioskMode: boolean): void => {
    if (isKioskMode) {
      overlay.classList.remove('hide')
    } else {
      overlay.classList.add('hide')
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
    return MIN_OFFSET
  },
}

const updateOverlay = async (): Promise<void> => {
  const kioskMode = new URLSearchParams(window.location.search).has('kiosk')
  const overlay = document.querySelector<HTMLElement>('.overlay')
  if (overlay === null) return
  Functions.ShowHideKiosk(overlay, kioskMode)
  const offset = Functions.CalculateOffset()
  overlay.style.setProperty('opacity', `${Functions.GetOpacity(offset)}`)
  await Promise.resolve()
}

export default new CyclicUpdater(updateOverlay, UPDATE_INTERVAL)
