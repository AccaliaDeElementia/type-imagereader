'use sanity'

import type { Knex } from 'knex'
import knex from 'knex'

const initialize = async (): Promise<Knex> => {
  const knexInstance = Imports.knex(Functions.Environment)
  await knexInstance.migrate.latest()
  return knexInstance
}

export interface KnexOptions {
  client: string
  connection: Record<'host' | 'database' | 'user' | 'password' | 'filename', string>
  useNullAsDefault?: boolean
  pool?: {
    min: number
    max: number
  }
  migrations: {
    tableName: string
  }
}

export class Imports {
  public static knex = knex
  public static Initializer?: Promise<Knex>
}

export class Functions {
  public static get EnvironmentName (): string {
    if (process.env.DB_CLIENT == null || process.env.DB_CLIENT.length < 1) {
      return 'development'
    }
    return process.env.DB_CLIENT
  }

  public static get Environment (): KnexOptions {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-require-imports  -- Knex be weird... this can probably be done differently...?
    const connection = require('../knexfile')[Functions.EnvironmentName]
    const keys = ['host', 'database', 'user', 'password', 'filename']
    keys.forEach((key: string) => {
      const value = process.env[`DB_${key.toUpperCase()}`]
      if (value !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Knex be weird... this can probably be done differently...?
        connection.connection[key] = value
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Knex be weird... this can probably be done differently...?
    return connection as KnexOptions
  }
}

export default {
  initialize: async (): Promise<Knex> => await (Imports.Initializer ??= initialize())
}
