'use sanity'

import { Knex } from 'knex'

export async function up (knex: Knex): Promise<void> {
  await knex.schema.alterTable('bookmarks', table => {
    table.unique(['path'])
  })
}

export async function down (knex: Knex): Promise<void> {
  await knex.schema.alterTable('bookmarks', table => {
    table.dropUnique(['path'])
  })
}
