'use sanity'

import type { Knex } from 'knex'
import { isPostgres } from '#sync/syncItemsDialect.js'

export async function up(knex: Knex): Promise<void> {
  if (!isPostgres(knex)) return
  await knex.raw('ALTER TABLE ?? SET UNLOGGED', ['syncitems'])
}

export async function down(knex: Knex): Promise<void> {
  if (!isPostgres(knex)) return
  await knex.raw('ALTER TABLE ?? SET LOGGED', ['syncitems'])
}
