'use sanity'

export function getShowUnreadOnly(): boolean {
  return window.localStorage.ShowUnreadOnly === 'true'
}

function SetShowUnreadOnly(value: boolean): void {
  window.localStorage.ShowUnreadOnly = `${value}`
}

function UpdateUnreadSelectorSlider(): void {
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
  Internals.UpdateUnreadSelectorSlider()

  document.querySelector('.selectUnreadAll')?.addEventListener('click', (evt) => {
    Internals.SetShowUnreadOnly(!Internals.getShowUnreadOnly())
    Internals.UpdateUnreadSelectorSlider()
    evt.preventDefault()
  })
}

export const Internals = {
  getShowUnreadOnly,
  SetShowUnreadOnly,
  UpdateUnreadSelectorSlider,
}
