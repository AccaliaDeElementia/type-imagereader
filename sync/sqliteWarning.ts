'use sanity'

import type { Debugger } from 'debug'
import type { Knex } from 'knex'

import { isPostgres as _isPostgres } from './syncItemsDialect.js'

// SQLite's whole-DB write lock, chunked-INSERT bulk loads and page cache
// pressure all scale unfavourably as row count grows. See README for details.
const SQLITE_PICTURES_SOFT_LIMIT = 100_000
const SQLITE_PICTURES_FIRM_LIMIT = 250_000
const WARNING_BANNER = '================================================================'

export const Imports = {
  isPostgres: _isPostgres,
}

export const SqliteWarning = { sqliteSizeWarningEmitted: false }

export function emitSqliteSizeWarning(logger: Debugger, knex: Knex, pictureCount: number): void {
  if (Imports.isPostgres(knex)) return
  if (pictureCount <= SQLITE_PICTURES_SOFT_LIMIT) return
  if (SqliteWarning.sqliteSizeWarningEmitted) return
  SqliteWarning.sqliteSizeWarningEmitted = true
  const count = pictureCount.toLocaleString()
  const soft = SQLITE_PICTURES_SOFT_LIMIT.toLocaleString()
  const firm = SQLITE_PICTURES_FIRM_LIMIT.toLocaleString()
  const message =
    pictureCount > SQLITE_PICTURES_FIRM_LIMIT
      ? `WARNING: SQLite picture count (${count}) exceeds the firm recommended limit (${firm}). Initial sync and 24h re-syncs will be slow; PostgreSQL is strongly recommended at this size. See README for details.`
      : `WARNING: SQLite picture count (${count}) exceeds the soft recommended limit (${soft}). Performance may degrade as the library grows; PostgreSQL is recommended above ${firm} pictures. See README for details.`
  logger(WARNING_BANNER)
  logger(message)
  logger(WARNING_BANNER)
}
