'use sanity'

import _debug from 'debug'

import { Initialize as _Initialize } from '../utils/persistance.js'
import { FindSyncItems as _FindSyncItems } from './findItems.js'
import { SyncAllPictures as _SyncAllPictures } from './pictures.js'
import { SyncAllFolders as _SyncAllFolders } from './folders.js'
import {
  PruneEmptyFolders as _PruneEmptyFolders,
  UpdateFolderPictureCounts as _UpdateFolderPictureCounts,
} from './folderCounts.js'
import { EmitSqliteSizeWarning as _EmitSqliteSizeWarning } from './sqliteWarning.js'

const ZERO = 0
const MS_PER_SECOND = 1000
const ELAPSED_DECIMALS = 2

export const LOG_PREFIX = 'type-imagereader:sync:synchronize'

export const Imports = {
  debug: _debug,
  Initialize: _Initialize,
  FindSyncItems: _FindSyncItems,
  SyncAllPictures: _SyncAllPictures,
  SyncAllFolders: _SyncAllFolders,
  UpdateFolderPictureCounts: _UpdateFolderPictureCounts,
  PruneEmptyFolders: _PruneEmptyFolders,
  EmitSqliteSizeWarning: _EmitSqliteSizeWarning,
}

const elapsedSeconds = (since: number): string => ((Date.now() - since) / MS_PER_SECOND).toFixed(ELAPSED_DECIMALS)

export async function Synchronize(): Promise<void> {
  const logger = Imports.debug(LOG_PREFIX)
  const start = Date.now()
  logger('Folder Synchronization Begins')
  const knex = await Imports.Initialize()
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
    const foundPics = await runStep('FindSyncItems', async () => await Imports.FindSyncItems(knex))
    if (foundPics <= ZERO) {
      throw new Error('Found Zero images, refusing to process empty base folder')
    }
    await runStep('SyncAllPictures', async () => {
      await Imports.SyncAllPictures(knex)
    })
    await runStep('SyncAllFolders', async () => {
      await Imports.SyncAllFolders(knex)
    })
    await runStep('UpdateFolderPictureCounts', async () => {
      await Imports.UpdateFolderPictureCounts(knex)
    })
    await runStep('PruneEmptyFolders', async () => {
      await Imports.PruneEmptyFolders(knex)
    })
    Imports.EmitSqliteSizeWarning(logger, knex, foundPics)
  } catch (e) {
    logger('Folder Synchronization Failed', e)
    logger(`Folder Synchronization Failed after ${elapsedSeconds(start)}s`)
    throw e
  }
  logger(`Folder Synchronization Complete after ${elapsedSeconds(start)}s`)
}
