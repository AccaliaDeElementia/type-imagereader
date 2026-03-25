'use sanity'

import { NavigateTo, Pictures } from '.'
import type { Picture } from '#contracts/listing'
import { HasValues } from '#utils/helpers'

const NO_SUCH_INDEX = -1
const MINIMUM_INDEX = 0
const LENGTH_TO_MAX_INDEX_OFFSET = -1
const NEXT_INDEX_OFFSET = 1
const PREV_INDEX_OFFSET = -1
export function ChoosePictureIndex(navi: NavigateTo, current: number, unreads: Picture[]): number {
  if (!HasValues(Pictures.pictures)) return NO_SUCH_INDEX
  switch (navi) {
    case NavigateTo.First:
      return MINIMUM_INDEX
    case NavigateTo.PreviousUnread:
      return unreads.pop()?.index ?? NO_SUCH_INDEX
    case NavigateTo.Previous:
      return current > MINIMUM_INDEX ? current + PREV_INDEX_OFFSET : NO_SUCH_INDEX
    case NavigateTo.Next:
      return current < Pictures.pictures.length + LENGTH_TO_MAX_INDEX_OFFSET
        ? current + NEXT_INDEX_OFFSET
        : NO_SUCH_INDEX
    case NavigateTo.NextUnread:
      return unreads.shift()?.index ?? NO_SUCH_INDEX
    case NavigateTo.Last:
      return Pictures.pictures.length + LENGTH_TO_MAX_INDEX_OFFSET
  }
}
