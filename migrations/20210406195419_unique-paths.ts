'use sanity'

import { type Knex } from 'knex'

export async function up (knex: Knex): Promise<void> {
  await knex.schema.alterTable('folders', table => {
    table.unique(['path'])
  })
    .then(() => knex.schema.alterTable('pictures', table => {
      table.unique(['path'])
    }))
}

export async function down (knex: Knex): Promise<void> {
  await knex.schema.alterTable('folders', table => {
    table.dropUnique(['path'])
  })
    .then(() => knex.schema.alterTable('pictures', table => {
      table.dropUnique(['path'])
    }))
}
