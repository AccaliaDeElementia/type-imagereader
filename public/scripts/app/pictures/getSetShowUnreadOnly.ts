'use sanity'

export function GetShowUnreadOnly(): boolean {
  return window.localStorage.ShowUnseenOnly === 'true'
}
export function SetShowUnreadOnly(value: boolean): void {
  window.localStorage.ShowUnseenOnly = `${value}`
}
