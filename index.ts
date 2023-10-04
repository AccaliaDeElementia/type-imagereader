'use sanity'

import synchronize from './utils/syncfolders'
import start from './Server'

export class ImageReader {
  static StartServer = start
  static Synchronize = synchronize
  static Interval?: ReturnType<typeof setInterval>
  static SyncRunning = false
  static SyncInterval = 3 * 60 * 60 * 1000 // Three Hours
  static async Run () {
    const port = Number(process.env.PORT || 3030)
    if (Number.isNaN(port)) {
      throw new Error(`Port ${port} (from env: ${process.env.PORT}) is not a number. Valid ports must be a number.`)
    }
    if (!Number.isInteger(port)) {
      throw new Error(`Port ${port} is not integer. Valid ports must be integer between 0 and 65535.`)
    }
    if (port < 0 || port > 65535) {
      throw new Error(`Port ${port} is out of range. Valid ports must be between 0 and 65535.`)
    }
    this.StartServer(port)

    if (!process.env.SKIP_SYNC) {
      const doSync = async () => {
        if (this.SyncRunning) {
          return
        }
        this.SyncRunning = true
        await this.Synchronize()
        this.SyncRunning = false
      }
      doSync()
      this.Interval = setInterval(doSync, this.SyncInterval)
    }
  }
}

/* istanbul ignore if */
if (require.main === module) {
  ImageReader.Run()
}
