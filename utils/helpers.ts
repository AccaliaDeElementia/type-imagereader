const ZERO_LENGTH = 0
export function StringIsNullOrEmpty(str: string | null | undefined): boolean {
  return str === null || str === undefined || str.length === ZERO_LENGTH
}

export function ReqParamToString(input: string | string[] | undefined, defaultValue = ''): string {
  if (input === undefined) return defaultValue
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
