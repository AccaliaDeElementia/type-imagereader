// use sanity

import { CyclicUpdater } from './updater'

const updateTime = () => {
  const now = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const timeElem = document.querySelector('.time')
  if (timeElem) {
    timeElem.innerHTML = `${('00' + now.getHours()).slice(-2)}:${('00' + now.getMinutes()).slice(-2)}`
  }
  const dateElem = document.querySelector('.date')
  if (dateElem) {
    dateElem.innerHTML = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`
  }
  return Promise.resolve()
}

export default CyclicUpdater.create(updateTime, 100)
