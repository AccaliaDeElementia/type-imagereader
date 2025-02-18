import type { Knex } from 'knex'
import { createHash } from 'crypto'

const BATCH_SIZE = 1000
const HASH_LENGTH = 100

interface PictureWithPath {
  path: string
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pictures', (table) => {
    table.string('pathHash', HASH_LENGTH)
  })
  await knex.schema.alterTable('syncitems', (table) => {
    table.string('pathHash', HASH_LENGTH)
  })
  const toUpdate = (await knex.select('path').from('pictures')).map(({ path }: PictureWithPath) => ({
    path,
    pathHash: createHash('sha512').update(path).digest('base64'),
  }))
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    await knex('pictures')
      .insert(toUpdate.slice(i, i + BATCH_SIZE))
      .onConflict('path')
      .merge()
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('syncitems', (table) => {
    table.dropColumn('pathHash')
  })
  await knex.schema.alterTable('pictures', (table) => {
    table.dropColumn('pathHash')
  })
}
