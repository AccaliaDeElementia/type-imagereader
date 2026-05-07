'use sanity'

import type { Debugger } from 'debug'
import type { Knex } from 'knex'

import { IsPostgres as _IsPostgres } from './syncItemsDialect.js'

// SQLite degrades steadily as the library grows: chunked-INSERT bulk loads, the
// whole-DB write lock, and disk page cache pressure all scale unfavourably.
// Above the soft limit performance is noticeably worse than PostgreSQL; above
// the firm limit the initial-sync and 24h re-sync experience is poor enough
// that PostgreSQL is strongly recommended. See README for details.
const SQLITE_PICTURES_SOFT_LIMIT = 100_000
const SQLITE_PICTURES_FIRM_LIMIT = 250_000
const WARNING_BANNER = '================================================================'

export const Imports = {
  IsPostgres: _IsPostgres,
}

export const Functions = {
  // Once-per-process flag so the warning fires on startup but not on every
  // recurring scheduled re-sync. Tests reset this between runs.
  SqliteSizeWarningEmitted: false,
  EmitSqliteSizeWarning: (logger: Debugger, knex: Knex, pictureCount: number): void => {
    if (Imports.IsPostgres(knex)) return
    if (pictureCount <= SQLITE_PICTURES_SOFT_LIMIT) return
    if (Functions.SqliteSizeWarningEmitted) return
    Functions.SqliteSizeWarningEmitted = true
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
  },
}
