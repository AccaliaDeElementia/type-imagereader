'use sanity'

import { HasValues } from '../../../../utils/helpers'
import { Publish } from '../pubsub'

const INDEX_OFFSET = 1
const MINIMUM_INDEX = 0
export function SelectPage(index: number): void {
  const links = document.querySelectorAll('.pagination .page-item')
  if (!HasValues(links)) {
    Publish('Pictures:SelectPage', 'Default Page Selected')
    return
  } else if (index <= MINIMUM_INDEX || index >= links.length - INDEX_OFFSET) {
    Publish('Loading:Error', 'Invalid Page Index Selected')
    return
  }
  links.forEach((element: Element, i: number) => {
    if (i === index) {
      element.classList.add('active')
    } else {
      element.classList.remove('active')
    }
  })
  const content = document.querySelectorAll('#tabImages .page')
  content.forEach((element: Element, i: number) => {
    if (i === index - INDEX_OFFSET) {
      element.classList.remove('hidden')
    } else {
      element.classList.add('hidden')
    }
  })
  Publish('Pictures:SelectPage', `New Page ${index} Selected`)
}
