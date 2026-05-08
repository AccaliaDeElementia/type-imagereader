'use sanity'

export function GetShowUnreadOnly(): boolean {
  return window.localStorage.ShowUnreadOnly === 'true'
}

function SetShowUnreadOnly(value: boolean): void {
  window.localStorage.ShowUnreadOnly = `${value}`
}

function UpdateUnreadSelectorSlider(): void {
  const element = document.querySelector('.selectUnreadAll > div')
  if (Internals.GetShowUnreadOnly()) {
    element?.classList.add('unread')
    element?.classList.remove('all')
  } else {
    element?.classList.remove('unread')
    element?.classList.add('all')
  }
}

export function InitUnreadSelectorSlider(): void {
  Internals.UpdateUnreadSelectorSlider()

  document.querySelector('.selectUnreadAll')?.addEventListener('click', (evt) => {
    Internals.SetShowUnreadOnly(!Internals.GetShowUnreadOnly())
    Internals.UpdateUnreadSelectorSlider()
    evt.preventDefault()
  })
}

export const Internals = {
  GetShowUnreadOnly,
  SetShowUnreadOnly,
  UpdateUnreadSelectorSlider,
}
