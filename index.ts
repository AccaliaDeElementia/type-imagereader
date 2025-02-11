'use sanity'

// force reading from .env before any imports fire
import 'dotenv/config'

import synchronize from './utils/syncfolders'
import start from './Server'

export class ImageReader {
  static StartServer = start
  static Synchronize = synchronize
  static Interval?: ReturnType<typeof setInterval>
  static SyncRunning = false
  static SyncInterval = 3 * 60 * 60 * 1000 // Three Hours
  static async Run (): Promise<void> {
    const port = Number((process.env.PORT != null && process.env.PORT.length > 0) ? process.env.PORT : 3030)
    if (Number.isNaN(port)) {
      throw new Error(`Port ${port} (from env: ${process.env.PORT}) is not a number. Valid ports must be a number.`)
    }
    if (!Number.isInteger(port)) {
      throw new Error(`Port ${port} is not integer. Valid ports must be integer between 0 and 65535.`)
    }
    if (port < 0 || port > 65535) {
      throw new Error(`Port ${port} is out of range. Valid ports must be between 0 and 65535.`)
    }
    await this.StartServer(port)

    if (process.env.SKIP_SYNC == null ||
      (process.env.SKIP_SYNC !== '1' && process.env.SKIP_SYNC !== 'true')) {
      const doSync = async (): Promise<void> => {
        if (this.SyncRunning) {
          return
        }
        this.SyncRunning = true
        try {
          await this.Synchronize()
        } finally {
          this.SyncRunning = false
        }
      }
      doSync().catch(() => null)
      this.Interval = setInterval(() => { doSync().catch(() => null) }, this.SyncInterval)
    }
  }
}

/* istanbul ignore if */
if (require.main === module) {
  ImageReader.Run().catch(() => null)
}
