'use sanity'

import type { Knex } from 'knex'

const DEFAULT_COUNT = 0

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('folders', (table) => {
    table.dropColumn('seen')
    table.integer('seenCount').notNullable().defaultTo(DEFAULT_COUNT)
    table.integer('totalCount').notNullable().defaultTo(DEFAULT_COUNT)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('folders', (table) => {
    table.boolean('seen').notNullable().defaultTo(false)
    table.dropColumns('seenCount', 'totalCount')
  })
}
