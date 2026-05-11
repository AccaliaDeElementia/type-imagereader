'use sanity'

import _debug from 'debug'

import { initialize as _initialize } from '../utils/persistence.js'
import { findSyncItems as _findSyncItems } from './findItems.js'
import { syncAllPictures as _syncAllPictures } from './pictures.js'
import { syncAllFolders as _syncAllFolders } from './folders.js'
import {
  pruneEmptyFolders as _pruneEmptyFolders,
  updateFolderPictureCounts as _updateFolderPictureCounts,
} from './folderCounts.js'
import { emitSqliteSizeWarning as _emitSqliteSizeWarning } from './sqliteWarning.js'

const ZERO = 0
const MS_PER_SECOND = 1000
const ELAPSED_DECIMALS = 2

export const LOG_PREFIX = 'type-imagereader:sync:synchronize'

export const Imports = {
  debug: _debug,
  initialize: _initialize,
  findSyncItems: _findSyncItems,
  syncAllPictures: _syncAllPictures,
  syncAllFolders: _syncAllFolders,
  updateFolderPictureCounts: _updateFolderPictureCounts,
  pruneEmptyFolders: _pruneEmptyFolders,
  emitSqliteSizeWarning: _emitSqliteSizeWarning,
}

const elapsedSeconds = (since: number): string => ((Date.now() - since) / MS_PER_SECOND).toFixed(ELAPSED_DECIMALS)

export async function synchronize(): Promise<void> {
  const logger = Imports.debug(LOG_PREFIX)
  const start = Date.now()
  logger('Folder Synchronization Begins')
  const knex = await Imports.initialize()
  const runStep = async <T>(label: string, step: () => Promise<T>): Promise<T> => {
    const stepStart = Date.now()
    try {
      const result = await step()
      logger(`${label} completed in ${elapsedSeconds(stepStart)}s`)
      return result
    } catch (e) {
      logger(`${label} failed after ${elapsedSeconds(stepStart)}s`, e)
      throw e
    }
  }
  try {
    const foundPics = await runStep('findSyncItems', async () => await Imports.findSyncItems(knex))
    if (foundPics <= ZERO) {
      throw new Error('Found Zero images, refusing to process empty base folder')
    }
    await runStep('syncAllPictures', async () => {
      await Imports.syncAllPictures(knex)
    })
    await runStep('syncAllFolders', async () => {
      await Imports.syncAllFolders(knex)
    })
    await runStep('updateFolderPictureCounts', async () => {
      await Imports.updateFolderPictureCounts(knex)
    })
    await runStep('pruneEmptyFolders', async () => {
      await Imports.pruneEmptyFolders(knex)
    })
    Imports.emitSqliteSizeWarning(logger, knex, foundPics)
  } catch (e) {
    logger('Folder Synchronization Failed', e)
    logger(`Folder Synchronization Failed after ${elapsedSeconds(start)}s`)
    throw e
  }
  logger(`Folder Synchronization Complete after ${elapsedSeconds(start)}s`)
}
