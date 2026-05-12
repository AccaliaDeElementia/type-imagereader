'use sanity'

export function getShowUnreadOnly(): boolean {
  return window.localStorage.ShowUnreadOnly === 'true'
}

function setShowUnreadOnly(value: boolean): void {
  window.localStorage.ShowUnreadOnly = `${value}`
}

function updateUnreadSelectorSlider(): void {
  const element = document.querySelector('.selectUnreadAll > div')
  if (Internals.getShowUnreadOnly()) {
    element?.classList.add('unread')
    element?.classList.remove('all')
  } else {
    element?.classList.remove('unread')
    element?.classList.add('all')
  }
}

export function initUnreadSelectorSlider(): void {
  Internals.updateUnreadSelectorSlider()

  document.querySelector('.selectUnreadAll')?.addEventListener('click', (evt) => {
    Internals.setShowUnreadOnly(!Internals.getShowUnreadOnly())
    Internals.updateUnreadSelectorSlider()
    evt.preventDefault()
  })
}

export const Internals = {
  getShowUnreadOnly,
  setShowUnreadOnly,
  updateUnreadSelectorSlider,
}
