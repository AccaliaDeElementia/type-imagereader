'use sanity'

import { Knex } from 'knex'

export async function up (knex: Knex): Promise<void> {
  await knex.schema.alterTable('folders', table => {
    table.string('firstPicture', 8192)
  })
  const toUpdate = await knex
    .with('firsts',
      qb => qb
        .select('pictures.folder')
        .min({
          sortKey: 'pictures.sortKey'
        })
        .from('pictures')
        .groupBy('pictures.folder')
    )
    .select('pictures.folder as path')
    .min('pictures.path as firstPicture')
    .from('firsts')
    .join('pictures', {
      'firsts.folder': 'pictures.folder',
      'firsts.sortKey': 'pictures.sortKey'
    })
    .groupBy('pictures.folder')
    .orderBy('pictures.folder', 'pictures.path')
  for (let i = 0; i < toUpdate.length; i += 1000) {
    await knex('folders')
      .insert(toUpdate.slice(i, i + 1000))
      .onConflict('path')
      .merge()
  }
}

export async function down (knex: Knex): Promise<void> {
  await knex.schema.alterTable('folders', table => {
    table.dropColumn('firstPicture')
  })
}
