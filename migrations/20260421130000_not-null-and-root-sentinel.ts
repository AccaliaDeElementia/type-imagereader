'use sanity'

import type { Knex } from 'knex'
import { createHash } from 'node:crypto'
import posix from 'node:path'
import { IsPostgres } from '../utils/syncItemsDialect'

const PAD_LENGTH = 20
const TRAILING_SLASH_OFFSET = -1
const PATH_START = 0

// Simplified sortKey generator inlined so this migration is self-contained
// and not coupled to the current app's sort-key implementation (which may
// evolve). The heal step is expected to find zero rows in a healthy database;
// any rows it does fix up get a "good enough" sortKey that preserves ordering.
function toSortKeyFallback(key: string): string {
  const zeroes = '0'.repeat(PAD_LENGTH)
  return key
    .toLowerCase()
    .replace(/\d+/gv, (num) => (num.length >= PAD_LENGTH ? num : `${zeroes}${num}`.slice(-PAD_LENGTH)))
}

function parentOf(path: string): string {
  if (path === posix.sep) return ''
  const withoutSlash = path.slice(PATH_START, TRAILING_SLASH_OFFSET)
  const parent = posix.dirname(withoutSlash)
  return parent === posix.sep ? posix.sep : `${parent}${posix.sep}`
}

function basenameOf(path: string): string {
  if (path === posix.sep) return ''
  return posix.basename(path.slice(PATH_START, TRAILING_SLASH_OFFSET))
}

export async function up(knex: Knex): Promise<void> {
  // -------------------------------------------------------------------------
  // Step 1 — Heal data so every ALTER COLUMN … SET NOT NULL succeeds.
  //
  // syncitems is UNLOGGED and rebuilt from scratch on every full sync —
  // simpler and safer to truncate than to heal.
  // -------------------------------------------------------------------------
  await knex('syncitems').truncate()

  // Rows missing their primary identifier can't be meaningfully healed.
  await knex('bookmarks').whereNull('path').delete()
  await knex('folders').whereNull('path').delete()
  await knex('pictures').whereNull('path').delete()
  await knex('pictures').whereNull('folder').delete()

  // Root folder: legacy NULL → '' sentinel.
  await knex('folders').where({ path: posix.sep }).whereNull('folder').update({ folder: '' })

  // Non-root folder rows with a null folder column: reconstruct parent path.
  const brokenFolders = await knex('folders')
    .select<Array<{ path: string }>>('path')
    .whereNull('folder')
    .andWhereNot({ path: posix.sep })
  for (const row of brokenFolders) {
    // eslint-disable-next-line no-await-in-loop -- one-time migration; simpler than batching
    await knex('folders')
      .where({ path: row.path })
      .update({ folder: parentOf(row.path) })
  }

  // Folder rows with a null sortKey: reconstruct from basename.
  const noSortKeyFolders = await knex('folders').select<Array<{ path: string }>>('path').whereNull('sortKey')
  for (const row of noSortKeyFolders) {
    // eslint-disable-next-line no-await-in-loop -- one-time migration
    await knex('folders')
      .where({ path: row.path })
      .update({ sortKey: toSortKeyFallback(basenameOf(row.path)) })
  }

  // Picture rows with a null sortKey: reconstruct from basename.
  const noSortKeyPics = await knex('pictures').select<Array<{ path: string }>>('path').whereNull('sortKey')
  for (const row of noSortKeyPics) {
    // eslint-disable-next-line no-await-in-loop -- one-time migration
    await knex('pictures')
      .where({ path: row.path })
      .update({
        sortKey: toSortKeyFallback(posix.basename(row.path)),
      })
  }

  // Picture rows with a null pathHash: recompute.
  const noHashPics = await knex('pictures').select<Array<{ path: string }>>('path').whereNull('pathHash')
  for (const row of noHashPics) {
    // eslint-disable-next-line no-await-in-loop -- one-time migration
    await knex('pictures')
      .where({ path: row.path })
      .update({ pathHash: createHash('sha512').update(row.path).digest('base64') })
  }

  // -------------------------------------------------------------------------
  // Step 2 — Add NOT NULL constraints via raw SQL (keeps existing column
  // types and lengths; knex's .string(...).alter() would default to
  // varchar(255) and truncate longer data).
  // -------------------------------------------------------------------------
  const notNullColumns: Array<[string, string]> = [
    ['folders', 'folder'],
    ['folders', 'path'],
    ['folders', 'sortKey'],
    ['pictures', 'folder'],
    ['pictures', 'path'],
    ['pictures', 'sortKey'],
    ['pictures', 'pathHash'],
    ['syncitems', 'folder'],
    ['syncitems', 'path'],
    ['syncitems', 'sortKey'],
    ['syncitems', 'pathHash'],
    ['bookmarks', 'path'],
  ]
  for (const [table, column] of notNullColumns) {
    // eslint-disable-next-line no-await-in-loop -- serial DDL during migration
    await knex.raw('ALTER TABLE ?? ALTER COLUMN ?? SET NOT NULL', [table, column])
  }

  // -------------------------------------------------------------------------
  // Step 3 — CHECK constraint enforcing the biconditional: a row's folder
  // column is the empty-string sentinel IFF its path is the filesystem root.
  // This catches the other direction of corruption that NOT NULL alone
  // doesn't: a non-root row set to '', or a root row set to a real path.
  // -------------------------------------------------------------------------
  await knex.raw("ALTER TABLE ?? ADD CONSTRAINT folders_root_sentinel_check CHECK ((?? = '') = (?? = '/'))", [
    'folders',
    'folder',
    'path',
  ])
  await knex.raw("ALTER TABLE ?? ADD CONSTRAINT syncitems_root_sentinel_check CHECK ((?? = '') = (?? = '/'))", [
    'syncitems',
    'folder',
    'path',
  ])
}

export async function down(knex: Knex): Promise<void> {
  // SQLite has no DROP CONSTRAINT; the constraints are rebuilt away when the table is rebuilt
  // by the column-NOT-NULL operations below. PostgreSQL needs the explicit drop.
  if (IsPostgres(knex)) {
    await knex.raw('ALTER TABLE ?? DROP CONSTRAINT IF EXISTS folders_root_sentinel_check', ['folders'])
    await knex.raw('ALTER TABLE ?? DROP CONSTRAINT IF EXISTS syncitems_root_sentinel_check', ['syncitems'])
  }

  const notNullColumns: Array<[string, string]> = [
    ['folders', 'folder'],
    ['folders', 'path'],
    ['folders', 'sortKey'],
    ['pictures', 'folder'],
    ['pictures', 'path'],
    ['pictures', 'sortKey'],
    ['pictures', 'pathHash'],
    ['syncitems', 'folder'],
    ['syncitems', 'path'],
    ['syncitems', 'sortKey'],
    ['syncitems', 'pathHash'],
    ['bookmarks', 'path'],
  ]
  for (const [table, column] of notNullColumns) {
    // eslint-disable-next-line no-await-in-loop -- serial DDL during migration
    await knex.raw('ALTER TABLE ?? ALTER COLUMN ?? DROP NOT NULL', [table, column])
  }

  // Restore the pre-migration convention of NULL in the root folder row.
  await knex('folders').where({ path: posix.sep }).update({ folder: null })
}
