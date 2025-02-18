const ZERO_LENGTH = 0
export function StringIsNullOrEmpty(str: string | null | undefined): boolean {
  return str == null || str.length === ZERO_LENGTH
}
