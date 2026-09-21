'use sanity'

const SAMPLE_NUMBER = 4.71

export type ListingGuardCase = [string, unknown, boolean]
export type DeferredListingGuardCase = [string, () => unknown, boolean]

export const REJECTED_BY_ALL_LISTING_GUARDS: readonly ListingGuardCase[] = [
  ['null', null, false],
  ['undefined', undefined, false],
  ['empty array', [], false],
  ['array', [{}], false],
  ['number', SAMPLE_NUMBER, false],
  ['string', 'foo!', false],
  ['empty object', {}, false],
]

export function deferCases(cases: readonly ListingGuardCase[]): DeferredListingGuardCase[] {
  return cases.map(([title, value, expected]: ListingGuardCase): DeferredListingGuardCase => [
    title,
    () => value,
    expected,
  ])
}
