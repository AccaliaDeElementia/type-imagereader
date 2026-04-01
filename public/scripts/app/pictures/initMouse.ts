'use sanity'

import { UNINITIALIZED_SCALE, Pictures } from '.'
import { HasValue, ZERO_LENGTH } from '#utils/helpers'
import { Publish } from '../pubsub'

const LEFT_THIRD = 0.3333333333333333
const RIGHT_THIRD = 0.6666666666666666

export function InitMouse(): void {
  Pictures.initialScale = HasValue(window.visualViewport) ? window.visualViewport.scale : UNINITIALIZED_SCALE
  Pictures.mainImage?.parentElement?.addEventListener('click', (evt) => {
    if (HasValue(window.visualViewport) && Pictures.initialScale < window.visualViewport.scale) {
      Publish('Ignored Mouse Click', evt)
      return
    }
    const target = Pictures.mainImage?.parentElement?.getBoundingClientRect() ?? {
      left: ZERO_LENGTH,
      width: ZERO_LENGTH,
    }
    if (target.width === ZERO_LENGTH) {
      Publish('Ignored Mouse Click', evt)
      return
    }
    const x = evt.clientX - target.left
    if (x < target.width * LEFT_THIRD) {
      Publish('Action:Execute:Previous')
    } else if (x > target.width * RIGHT_THIRD) {
      Publish('Action:Execute:Next')
    } else {
      Publish('Action:Execute:ShowMenu')
    }
  })
}
