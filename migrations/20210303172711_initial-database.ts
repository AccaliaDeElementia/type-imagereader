'use sanity'

import type { Knex } from 'knex'

const MAX_STR_LENGTH = 8192
const MAX_SORT_KEY_LENGTH = 4096

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable('pictures', (table) => {
      table.increments('id').primary()
      table.string('folder', MAX_STR_LENGTH)
      table.string('path', MAX_STR_LENGTH)
      table.string('sortKey', MAX_STR_LENGTH)
      table.boolean('seen').notNullable().defaultTo(false)
      table.index('folder')
    })
    .then(() =>
      knex.schema.createTable('folders', (table) => {
        table.increments('id').primary()
        table.string('folder', MAX_STR_LENGTH)
        table.string('path', MAX_STR_LENGTH)
        table.string('sortKey', MAX_STR_LENGTH)
        table.string('current', MAX_STR_LENGTH)
        table.boolean('seen').notNullable().defaultTo(false)
        table.index('folder')
      }),
    )
    .then(() =>
      knex.schema.createTable('bookmarks', (table) => {
        table.increments('id').primary()
        table.string('path', MAX_STR_LENGTH)
      }),
    )
    .then(() =>
      knex.schema.createTable('syncitems', (table) => {
        table.string('folder', MAX_STR_LENGTH)
        table.string('path', MAX_STR_LENGTH)
        table.string('sortKey', MAX_SORT_KEY_LENGTH)
        table.boolean('isFile').notNullable().defaultTo(false)
        table.index('path')
      }),
    )
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .dropTable('bookmarks')
    .then(() => knex.schema.dropTable('folders'))
    .then(() => knex.schema.dropTable('pictures'))
    .then(() => knex.schema.dropTable('syncitems'))
}
