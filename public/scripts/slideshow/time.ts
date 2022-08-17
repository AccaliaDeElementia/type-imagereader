'use sanity'

import { CyclicUpdater } from './updater'

const updateTime = () => {
  const now = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  document.querySelector('.time')?.replaceChildren(
    document.createTextNode(
      `${('00' + now.getHours()).slice(-2)}:${('00' + now.getMinutes()).slice(-2)}`
    )
  )
  document.querySelector('.date')?.replaceChildren(
    document.createTextNode(
      `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`
    )
  )
  return Promise.resolve()
}

export default CyclicUpdater.create(updateTime, 100)
