'use sanity'

import { CyclicUpdater } from './updater.js'

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

function FormatTime(now: Date): string {
  return `${`00${now.getHours()}`.slice(-DIGITS_TO_KEEP)}:${`00${now.getMinutes()}`.slice(-DIGITS_TO_KEEP)}`
}

function FormatDate(now: Date): string {
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`
}

const updateTime = async (): Promise<void> => {
  const now = new Date()
  document.querySelector('.time')?.replaceChildren(Internals.FormatTime(now))
  document.querySelector('.date')?.replaceChildren(Internals.FormatDate(now))
  await Promise.resolve()
}

export const Internals = {
  FormatTime,
  FormatDate,
}

export const TimeUpdater = new CyclicUpdater(updateTime, TIME_UPDATE_INTERVAL)
