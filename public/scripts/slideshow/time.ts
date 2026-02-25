'use sanity'

import { CyclicUpdater } from './updater'

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DIGITS_TO_KEEP = 2
const TIME_UPDATE_INTERVAL = 100
export const Functions = {
  FormatTime: (now: Date): string =>
    `${`00${now.getHours()}`.slice(-DIGITS_TO_KEEP)}:${`00${now.getMinutes()}`.slice(-DIGITS_TO_KEEP)}`,
  FormatDate: (now: Date): string => `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`,
}

const updateTime = async (): Promise<void> => {
  const now = new Date()
  document.querySelector('.time')?.replaceChildren(Functions.FormatTime(now))
  document.querySelector('.date')?.replaceChildren(Functions.FormatDate(now))
  await Promise.resolve()
}

export default new CyclicUpdater(updateTime, TIME_UPDATE_INTERVAL)
