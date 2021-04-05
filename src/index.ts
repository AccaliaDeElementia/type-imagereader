
import synchronize from './utils/syncfolders'
import app from './Server'

(async () => {
  // Start the server
  const port = Number(process.env.PORT || 3030)
  app.listen(port, () => {})

  if (!process.env.SKIP_SYNC) {
    const oneHour = 60 * 60 * 1000
    let syncRunning = true
    await synchronize()
    syncRunning = false
    setInterval(async () => {
      if (syncRunning) {
        return
      }
      syncRunning = true
      await synchronize()
      syncRunning = false
    }, 3 * oneHour)
  }
})()
