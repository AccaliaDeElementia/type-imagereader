import * as Knex from 'knex'

export async function up (knex: Knex): Promise<void> {
  return knex.schema.createTable('pictures', (table) => {
    table.increments('id').primary()
    table.string('folder', 8192)
    table.string('path', 8192)
    table.string('sortKey', 8192)
    table.boolean('seen').notNullable().defaultTo(false)
    table.index('folder')
  })
    .then(() => knex.schema.createTable('folders', (table) => {
      table.increments('id').primary()
      table.string('folder', 8192)
      table.string('path', 8192)
      table.string('sortKey', 8192)
      table.string('current', 8192)
      table.boolean('seen').notNullable().defaultTo(false)
      table.index('folder')
    }))
    .then(() => knex.schema.createTable('bookmarks', (table) => {
      table.increments('id').primary()
      table.string('path', 8192)
    }))
    .then(() => knex.schema.createTable('syncitems', (table) => {
      table.string('folder', 8192)
      table.string('path', 8192)
      table.string('sortKey', 4096)
      table.boolean('isFile').notNullable().defaultTo(false)
      table.index('path')
    }))
}

export async function down (knex: Knex): Promise<void> {
  return knex.schema.dropTable('bookmarks')
    .then(() => knex.schema.dropTable('folders'))
    .then(() => knex.schema.dropTable('pictures'))
    .then(() => knex.schema.dropTable('syncitems'))
}
