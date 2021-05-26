import { Knex } from 'knex'

export async function up (knex: Knex): Promise<void> {
  return knex.schema.alterTable('folders', table => {
    table.dropColumn('seen')
    table.integer('seenCount').notNullable().defaultTo(0)
    table.integer('totalCount').notNullable().defaultTo(0)
  })
}

export async function down (knex: Knex): Promise<void> {
  return knex.schema.alterTable('folders', table => {
    table.boolean('seen').notNullable().defaultTo(false)
    table.dropColumns('seenCount', 'totalCount')
  })
}
