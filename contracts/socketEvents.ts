'use sanity'

export const SocketEvents = {
  ImageChanged: 'image-changed',
  PrevImage: 'prev-image',
  NextImage: 'next-image',
  GotoImage: 'goto-image',
  JoinSlideshow: 'join-slideshow',
  GetLaunchId: 'get-launchId',
} as const
