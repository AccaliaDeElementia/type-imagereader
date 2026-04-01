'use sanity'

export function GetShowUnreadOnly(): boolean {
  return window.localStorage.ShowUnreadOnly === 'true'
}
export function SetShowUnreadOnly(value: boolean): void {
  window.localStorage.ShowUnreadOnly = `${value}`
}
