'use sanity'

// force reading from .env before any imports fire
import 'dotenv/config'

import synchronize from './utils/syncfolders'
import start from './Server'
import { StringIsNullOrEmpty } from './utils/helpers'

const THREE_HOURS = 1_080_000
const DEFAULT_PORT = 3030
const MINIMUM_PORT = 0
const MAXIMUM_PORT = 65535

export const ImageReader = {
  StartServer: start,
  Synchronize: synchronize,
  Interval: ((): number | NodeJS.Timer | undefined => undefined)(),
  SyncRunning: false,
  SyncInterval: THREE_HOURS,
  Run: async (): Promise<void> => {
    const port = Number(!StringIsNullOrEmpty(process.env.PORT) ? process.env.PORT : DEFAULT_PORT)
    if (Number.isNaN(port)) {
      throw new Error(`Port ${port} (from env: ${process.env.PORT}) is not a number. Valid ports must be a number.`)
    }
    if (!Number.isInteger(port)) {
      throw new Error(`Port ${port} is not integer. Valid ports must be integer between 0 and 65535.`)
    }
    if (port < MINIMUM_PORT || port > MAXIMUM_PORT) {
      throw new Error(`Port ${port} is out of range. Valid ports must be between 0 and 65535.`)
    }
    await ImageReader.StartServer(port)

    if (process.env.SKIP_SYNC == null || (process.env.SKIP_SYNC !== '1' && process.env.SKIP_SYNC !== 'true')) {
      const doSync = async (): Promise<void> => {
        if (ImageReader.SyncRunning) {
          return
        }
        ImageReader.SyncRunning = true
        try {
          await ImageReader.Synchronize()
        } finally {
          ImageReader.SyncRunning = false
        }
      }
      doSync().catch(() => null)
      ImageReader.Interval = setInterval(() => {
        doSync().catch(() => null)
      }, ImageReader.SyncInterval)
    }
  },
}

/* istanbul ignore if */
if (require.main === module) {
  ImageReader.Run().catch(() => null)
}
