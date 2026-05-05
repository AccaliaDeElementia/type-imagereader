'use sanity'

import { Pictures } from './index.js'

export function UpdateUnreadSelectorSlider(): void {
  const element = document.querySelector('.selectUnreadAll > div')
  if (Pictures.GetShowUnreadOnly()) {
    element?.classList.add('unread')
    element?.classList.remove('all')
  } else {
    element?.classList.remove('unread')
    element?.classList.add('all')
  }
}
