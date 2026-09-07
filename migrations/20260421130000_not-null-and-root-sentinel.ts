'use sanity'

import type { Knex } from 'knex'
import { createHash } from 'node:crypto'
import posix from 'node:path'
import { isPostgres } from '#sync/syncItemsDialect.js'

const PAD_LENGTH = 20
const TRAILING_SLASH_OFFSET = -1
const PATH_START = 0

const NOT_NULL_COLUMNS: Array<[string, string]> = [
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

function sortKeyAsOfThisMigration(key: string): string {
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

async function truncateRebuildableSyncItems(knex: Knex): Promise<void> {
  await knex('syncitems').truncate()
}

async function deleteRowsMissingTheirPrimaryIdentifier(knex: Knex): Promise<void> {
  await knex('bookmarks').whereNull('path').delete()
  await knex('folders').whereNull('path').delete()
  await knex('pictures').whereNull('path').delete()
  await knex('pictures').whereNull('folder').delete()
}

async function adoptEmptyStringSentinelForRootFolder(knex: Knex): Promise<void> {
  await knex('folders').where({ path: posix.sep }).whereNull('folder').update({ folder: '' })
}

async function reconstructMissingFolderParents(knex: Knex): Promise<void> {
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
}

async function reconstructMissingFolderSortKeys(knex: Knex): Promise<void> {
  const noSortKeyFolders = await knex('folders').select<Array<{ path: string }>>('path').whereNull('sortKey')
  for (const row of noSortKeyFolders) {
    // eslint-disable-next-line no-await-in-loop -- one-time migration
    await knex('folders')
      .where({ path: row.path })
      .update({ sortKey: sortKeyAsOfThisMigration(basenameOf(row.path)) })
  }
}

async function reconstructMissingPictureSortKeys(knex: Knex): Promise<void> {
  const noSortKeyPics = await knex('pictures').select<Array<{ path: string }>>('path').whereNull('sortKey')
  for (const row of noSortKeyPics) {
    // eslint-disable-next-line no-await-in-loop -- one-time migration
    await knex('pictures')
      .where({ path: row.path })
      .update({
        sortKey: sortKeyAsOfThisMigration(posix.basename(row.path)),
      })
  }
}

async function recomputeMissingPictureHashes(knex: Knex): Promise<void> {
  const noHashPics = await knex('pictures').select<Array<{ path: string }>>('path').whereNull('pathHash')
  for (const row of noHashPics) {
    // eslint-disable-next-line no-await-in-loop -- one-time migration
    await knex('pictures')
      .where({ path: row.path })
      .update({ pathHash: createHash('sha512').update(row.path).digest('base64') })
  }
}

async function healRowsThatWouldViolateNotNull(knex: Knex): Promise<void> {
  await truncateRebuildableSyncItems(knex)
  await deleteRowsMissingTheirPrimaryIdentifier(knex)
  await adoptEmptyStringSentinelForRootFolder(knex)
  await reconstructMissingFolderParents(knex)
  await reconstructMissingFolderSortKeys(knex)
  await reconstructMissingPictureSortKeys(knex)
  await recomputeMissingPictureHashes(knex)
}

// knex's .string(...).alter() rewrites a column as varchar(255) and truncates
// longer values, so these are raw SQL.
async function addNotNullConstraints(knex: Knex): Promise<void> {
  for (const [table, column] of NOT_NULL_COLUMNS) {
    // eslint-disable-next-line no-await-in-loop -- serial DDL during migration
    await knex.raw('ALTER TABLE ?? ALTER COLUMN ?? SET NOT NULL', [table, column])
  }
}

async function dropNotNullConstraints(knex: Knex): Promise<void> {
  for (const [table, column] of NOT_NULL_COLUMNS) {
    // eslint-disable-next-line no-await-in-loop -- serial DDL during migration
    await knex.raw('ALTER TABLE ?? ALTER COLUMN ?? DROP NOT NULL', [table, column])
  }
}

async function addRootSentinelCheckConstraints(knex: Knex): Promise<void> {
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

async function dropRootSentinelCheckConstraints(knex: Knex): Promise<void> {
  // SQLite parses DROP CONSTRAINT as a syntax error.
  if (!isPostgres(knex)) return
  await knex.raw('ALTER TABLE ?? DROP CONSTRAINT IF EXISTS folders_root_sentinel_check', ['folders'])
  await knex.raw('ALTER TABLE ?? DROP CONSTRAINT IF EXISTS syncitems_root_sentinel_check', ['syncitems'])
}

async function restorePreMigrationNullRootFolder(knex: Knex): Promise<void> {
  await knex('folders').where({ path: posix.sep }).update({ folder: null })
}

export async function up(knex: Knex): Promise<void> {
  await healRowsThatWouldViolateNotNull(knex)
  await addNotNullConstraints(knex)
  await addRootSentinelCheckConstraints(knex)
}

export async function down(knex: Knex): Promise<void> {
  await dropRootSentinelCheckConstraints(knex)
  await dropNotNullConstraints(knex)
  await restorePreMigrationNullRootFolder(knex)
}
