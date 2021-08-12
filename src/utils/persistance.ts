'use sanity'

import * as Knex from 'knex'
const knex = require('knex')

const initialize = async (): Promise<Knex> => {
  const environment = process.env.DB_CLIENT || 'sqlite3'
  const connection = require('../knexfile')[environment]
  const keys = ['host', 'database', 'user', 'password', 'filename']
  keys.forEach(key => {
    const value = process.env[`DB_${key.toUpperCase()}`]
    if (value !== undefined) {
      connection.connection[key] = value
    }
  })
  const knexInstance = knex(connection)
  await knexInstance.migrate.latest()
  return knexInstance
}

const initializer = initialize()

export default {
  initialize: () => initializer
}
