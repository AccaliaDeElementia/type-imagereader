export enum ALTER_COUNTER {
  INCREMENT = 1,
  DECREMENT = -1,
  NONE = 0,
}

export const ZERO_LENGTH = 0
export const ZERO_COUNT = 0

export function StringIsNullOrEmpty(str: string | null | undefined): boolean {
  return str === null || str === undefined || str.length === ZERO_LENGTH
}

export function ReqParamToString(input: string | string[] | undefined | null, defaultValue = ''): string {
  if (input === undefined || input === null) return defaultValue
  if (input instanceof Array) {
    const mergedinput = input.join('/')
    return mergedinput.length > ZERO_LENGTH ? mergedinput : defaultValue
  }
  return input.length > ZERO_LENGTH ? input : defaultValue
}

export function StringishHasValue(str: string | null | undefined): str is string {
  return str !== null && str !== undefined && str.length > ZERO_LENGTH
}

export function HasValue<T>(obj: T | null | undefined): obj is T {
  return obj !== null && obj !== undefined
}

export function HasValues<T>(arrLike: ArrayLike<T> | null | undefined): arrLike is ArrayLike<T> {
  return arrLike !== null && arrLike !== undefined && arrLike.length > ZERO_LENGTH
}
export function GetFirst<T>(arrLike: ArrayLike<T> | null | undefined): T | undefined {
  if (arrLike === null || arrLike === undefined) {
    return undefined
  }
  return arrLike[ZERO_LENGTH]
}

interface SetLike<T> {
  size: number
  add: (val: T) => SetLike<T>
}

export function HasSetValues<T>(setLike: SetLike<T> | null | undefined): setLike is SetLike<T> {
  return setLike !== null && setLike !== undefined && setLike.size > ZERO_LENGTH
}

export function EscapeLikeWildcards(s: string): string {
  return s.replace(/\\/gv, '\\\\').replace(/%/gv, '\\%').replace(/_/gv, '\\_')
}

const PERCENT_MULT = 1000
const PERCENT_DIV = 10
const INDEX_OFFSET = 1
export function IndexToText(index: number): string {
  return (index + INDEX_OFFSET).toLocaleString()
}
export function IndexPercentToText(index: number, total: number): string {
  if (total === ZERO_COUNT) return ZERO_COUNT.toLocaleString()
  return (Math.floor((PERCENT_MULT * (index + INDEX_OFFSET)) / total) / PERCENT_DIV).toLocaleString()
}
