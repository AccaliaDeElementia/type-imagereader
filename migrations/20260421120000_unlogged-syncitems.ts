'use sanity'

import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE ?? SET UNLOGGED', ['syncitems'])
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE ?? SET LOGGED', ['syncitems'])
}
