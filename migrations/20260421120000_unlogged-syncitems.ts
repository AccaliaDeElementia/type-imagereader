'use sanity'

import type { Knex } from 'knex'
import { IsPostgres } from '../utils/syncItemsDialect.js'

export async function up(knex: Knex): Promise<void> {
  if (!IsPostgres(knex)) return
  await knex.raw('ALTER TABLE ?? SET UNLOGGED', ['syncitems'])
}

export async function down(knex: Knex): Promise<void> {
  if (!IsPostgres(knex)) return
  await knex.raw('ALTER TABLE ?? SET LOGGED', ['syncitems'])
}
