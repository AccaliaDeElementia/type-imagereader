'use sanity'

import { Pictures } from '.'
import type { Picture } from '../../../../contracts/listing'
import { Publish } from '../pubsub'
import { CloneNode, isHTMLElement } from '../utils'

export function MakePictureCard(picture: Picture): HTMLElement | undefined {
  const card = CloneNode(Pictures.imageCard, isHTMLElement)
  card?.setAttribute('data-backgroundImage', `url("/images/preview${picture.path}-image.webp")`)
  if (picture.seen) {
    card?.classList.add('seen')
  }
  card?.querySelector('h5')?.replaceChildren(picture.name)
  card?.addEventListener('click', () => {
    void Pictures.ChangePicture(picture)
    Publish('Menu:Hide')
  })
  return card
}
