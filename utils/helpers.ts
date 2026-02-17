const ZERO_LENGTH = 0
export function StringIsNullOrEmpty(str: string | null | undefined): boolean {
  return str === null || str === undefined || str.length === ZERO_LENGTH
}

export function ReqParamToString(input: string | string[] | undefined, defaultValue = ''): string {
  if (input === undefined) return defaultValue
  if (input instanceof Array) {
    input = input.join('/')
  }
  return input.length > 0 ? input : defaultValue
}
