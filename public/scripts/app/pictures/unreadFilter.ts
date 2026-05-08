'use sanity'

function GetShowUnreadOnly(): boolean {
  return window.localStorage.ShowUnreadOnly === 'true'
}

function SetShowUnreadOnly(value: boolean): void {
  window.localStorage.ShowUnreadOnly = `${value}`
}

function UpdateUnreadSelectorSlider(): void {
  const element = document.querySelector('.selectUnreadAll > div')
  if (UnreadFilter.GetShowUnreadOnly()) {
    element?.classList.add('unread')
    element?.classList.remove('all')
  } else {
    element?.classList.remove('unread')
    element?.classList.add('all')
  }
}

function InitUnreadSelectorSlider(): void {
  UnreadFilter.UpdateUnreadSelectorSlider()

  document.querySelector('.selectUnreadAll')?.addEventListener('click', (evt) => {
    UnreadFilter.SetShowUnreadOnly(!UnreadFilter.GetShowUnreadOnly())
    UnreadFilter.UpdateUnreadSelectorSlider()
    evt.preventDefault()
  })
}

export const UnreadFilter = {
  GetShowUnreadOnly,
  SetShowUnreadOnly,
  UpdateUnreadSelectorSlider,
  InitUnreadSelectorSlider,
}
