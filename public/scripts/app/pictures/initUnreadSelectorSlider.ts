'use sanity'

import { Pictures } from '.'

export function InitUnreadSelectorSlider(): void {
  Pictures.UpdateUnreadSelectorSlider()

  document.querySelector('.selectUnreadAll')?.addEventListener('click', (evt) => {
    Pictures.SetShowUnreadOnly(!Pictures.GetShowUnreadOnly())
    Pictures.UpdateUnreadSelectorSlider()
    evt.preventDefault()
  })
}
