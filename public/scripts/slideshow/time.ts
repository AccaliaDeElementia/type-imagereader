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

function formatTime(now: Date): string {
  return `${`00${now.getHours()}`.slice(-DIGITS_TO_KEEP)}:${`00${now.getMinutes()}`.slice(-DIGITS_TO_KEEP)}`
}

function formatDate(now: Date): string {
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`
}

const updateTime = async (): Promise<void> => {
  const now = new Date()
  document.querySelector('.time')?.replaceChildren(Internals.formatTime(now))
  document.querySelector('.date')?.replaceChildren(Internals.formatDate(now))
  await Promise.resolve()
}

export const Internals = {
  formatTime,
  formatDate,
}

export const timeUpdater = new CyclicUpdater(updateTime, TIME_UPDATE_INTERVAL)
