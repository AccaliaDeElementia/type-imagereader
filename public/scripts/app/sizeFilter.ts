'use sanity'

import { publish as _publish } from './pubsub.js'

export const Imports = {
  publish: _publish,
}

export function getShowOriginalSize(): boolean {
  return window.localStorage.ShowOriginalSize === 'true'
}

function setShowOriginalSize(value: boolean): void {
  window.localStorage.ShowOriginalSize = `${value}`
}

function updateSizeSelectorSlider(): void {
  const element = document.querySelector('.selectScaledOriginal > div')
  if (Internals.getShowOriginalSize()) {
    element?.classList.add('original')
    element?.classList.remove('scaled')
  } else {
    element?.classList.remove('original')
    element?.classList.add('scaled')
  }
}

export function initSizeSelectorSlider(): void {
  Internals.updateSizeSelectorSlider()

  document.querySelector('.selectScaledOriginal')?.addEventListener('click', (evt) => {
    Internals.setShowOriginalSize(!Internals.getShowOriginalSize())
    Internals.updateSizeSelectorSlider()
    // The picture on screen was fetched at the previous size; re-request it so
    // the toggle takes effect without navigating away and back.
    Imports.publish('Pictures:Refresh')
    evt.preventDefault()
  })
}

export const Internals = {
  getShowOriginalSize,
  setShowOriginalSize,
  updateSizeSelectorSlider,
}
