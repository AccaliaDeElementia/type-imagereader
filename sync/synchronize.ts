'use sanity'

import _debug from 'debug'

import { Initialize as _Initialize } from '../utils/persistance.js'
import { Functions as _FindItems } from './findItems.js'
import { SyncAllPictures as _SyncAllPictures } from './pictures.js'
import { SyncAllFolders as _SyncAllFolders } from './folders.js'
import {
  PruneEmptyFolders as _PruneEmptyFolders,
  UpdateFolderPictureCounts as _UpdateFolderPictureCounts,
} from './folderCounts.js'
import { EmitSqliteSizeWarning as _EmitSqliteSizeWarning } from './sqliteWarning.js'

const _Pictures = { SyncAllPictures: _SyncAllPictures }
const _Folders = { SyncAllFolders: _SyncAllFolders }
const _FolderCounts = {
  PruneEmptyFolders: _PruneEmptyFolders,
  UpdateFolderPictureCounts: _UpdateFolderPictureCounts,
}
const _SqliteWarning = { EmitSqliteSizeWarning: _EmitSqliteSizeWarning }

const ZERO = 0
const MS_PER_SECOND = 1000
const ELAPSED_DECIMALS = 2

export const Imports = {
  logPrefix: 'type-imagereader:sync:synchronize',
  debug: _debug,
  Initialize: _Initialize,
  FindItems: _FindItems,
  Pictures: _Pictures,
  Folders: _Folders,
  FolderCounts: _FolderCounts,
  SqliteWarning: _SqliteWarning,
}

const elapsedSeconds = (since: number): string => ((Date.now() - since) / MS_PER_SECOND).toFixed(ELAPSED_DECIMALS)

const synchronize = async (): Promise<void> => {
  const logger = Imports.debug(Imports.logPrefix)
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
    const foundPics = await runStep('FindSyncItems', async () => await Imports.FindItems.FindSyncItems(knex))
    if (foundPics <= ZERO) {
      throw new Error('Found Zero images, refusing to process empty base folder')
    }
    await runStep('SyncAllPictures', async () => {
      await Imports.Pictures.SyncAllPictures(knex)
    })
    await runStep('SyncAllFolders', async () => {
      await Imports.Folders.SyncAllFolders(knex)
    })
    await runStep('UpdateFolderPictureCounts', async () => {
      await Imports.FolderCounts.UpdateFolderPictureCounts(knex)
    })
    await runStep('PruneEmptyFolders', async () => {
      await Imports.FolderCounts.PruneEmptyFolders(knex)
    })
    Imports.SqliteWarning.EmitSqliteSizeWarning(logger, knex, foundPics)
  } catch (e) {
    logger('Folder Synchronization Failed', e)
    logger(`Folder Synchronization Failed after ${elapsedSeconds(start)}s`)
    throw e
  }
  logger(`Folder Synchronization Complete after ${elapsedSeconds(start)}s`)
}
export default synchronize
