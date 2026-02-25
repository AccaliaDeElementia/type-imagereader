'use sanity'

import { makeURI, NavigateTo, Pictures } from '.'

export async function LoadNextImage(): Promise<void> {
  const next = Pictures.GetPicture(Pictures.GetShowUnreadOnly() ? NavigateTo.NextUnread : NavigateTo.Next)
  if (next === undefined) {
    Pictures.nextPending = false
    Pictures.nextLoader = Promise.resolve()
  } else {
    const uri = makeURI(Pictures.mainImage?.width, Pictures.mainImage?.height, next)
    Pictures.nextPending = true
    const clearPending = (): void => {
      Pictures.nextPending = false
    }
    Pictures.nextLoader = window.fetch(uri).then(clearPending, clearPending)
  }
  await Pictures.nextLoader
}
