'use sanity'

import { Knex } from 'knex'
const knex = require('knex')

const initialize = async (): Promise<Knex> => {
  const knexInstance = Imports.knex(Functions.Environment)
  await knexInstance.migrate.latest()
  return knexInstance
}

export interface KnexOptions {
  client: string,
  connection: Record<'host' | 'database' | 'user' | 'password' | 'filename', string>,
  useNullAsDefault?: boolean,
  pool?: {
    min: number,
    max: number
  },
  migrations: {
    tableName: string
  }
}

export class Imports {
  public static knex = knex
  public static Initializer?: Promise<Knex>
}

export class Functions {
  public static get EnvironmentName () {
    return process.env.DB_CLIENT || 'development'
  }

  public static get Environment (): KnexOptions {
    const connection = require('../knexfile')[Functions.EnvironmentName]
    const keys = ['host', 'database', 'user', 'password', 'filename']
    keys.forEach((key: string) => {
      const value = process.env[`DB_${key.toUpperCase()}`]
      if (value !== undefined) {
        connection.connection[key] = value
      }
    })
    return connection as KnexOptions
  }
}

export default {
  initialize: () => (Imports.Initializer ??= initialize())
}
