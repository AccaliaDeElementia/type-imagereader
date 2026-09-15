'use sanity'

export const AUTO_DIMENSION = 'auto'
export const UNBOUNDED = Number.POSITIVE_INFINITY

export type RequestedDimension = number | typeof AUTO_DIMENSION

const POSITIVE_INTEGER = /^[1-9]\d*$/v
const DECIMAL_RADIX = 10

export function parseRequestedDimension(segment: string): number | undefined {
  if (segment === AUTO_DIMENSION) return UNBOUNDED
  if (!POSITIVE_INTEGER.test(segment)) return undefined
  return Number.parseInt(segment, DECIMAL_RADIX)
}

export function scaledImagePath(picturePath: string, width: RequestedDimension, height: RequestedDimension): string {
  return `/images/scaled/${width}/${height}${picturePath}-image.webp`
}
