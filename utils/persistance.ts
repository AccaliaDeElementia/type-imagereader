'use sanity'

import { readFile } from 'fs/promises'
import { join } from 'path'

import type { Knex } from 'knex'
import knex from 'knex'

const initialize = async (): Promise<Knex> => {
  const config = await Functions.GetKnexConfig()
  const knexInstance = Imports.knex(config)
  await knexInstance.migrate.latest()
  return knexInstance
}

export interface KnexOptions {
  client: string
  connection: {
    host?: string
    database?: string
    user?: string
    password?: string
    filename?: string
  }
  useNullAsDefault?: boolean
  pool?: {
    min: number
    max: number
  }
  migrations: {
    tableName: string
  }
}

export function isKnexOptions(obj: unknown): obj is KnexOptions {
  if (obj == null || typeof obj !== 'object') return false
  if (!('client' in obj) || typeof obj.client !== 'string') return false
  if (!('connection' in obj) || obj.connection == null || typeof obj.connection !== 'object') return false
  if ('host' in obj.connection && typeof obj.connection.host !== 'string') return false
  if ('database' in obj.connection && typeof obj.connection.database !== 'string') return false
  if ('user' in obj.connection && typeof obj.connection.user !== 'string') return false
  if ('password' in obj.connection && typeof obj.connection.password !== 'string') return false
  if ('filename' in obj.connection && typeof obj.connection.filename !== 'string') return false
  if ('useNullAsDefault' in obj && typeof obj.useNullAsDefault !== 'boolean') return false
  if ('pool' in obj) {
    if (obj.pool == null || typeof obj.pool !== 'object') return false
    if (!('min' in obj.pool) || typeof obj.pool.min !== 'number') return false
    if (!('max' in obj.pool) || typeof obj.pool.max !== 'number') return false
  }
  if (!('migrations' in obj) || obj.migrations == null || typeof obj.migrations !== 'object') return false
  if (!('tableName' in obj.migrations) || typeof obj.migrations.tableName !== 'string') return false
  return true
}

export function isDictionary(obj: unknown): obj is { [key: string]: unknown } {
  if (obj == null || typeof obj !== 'object') return false
  return true
}

export class Imports {
  public static knex = knex
  public static Initializer?: Promise<Knex>
  public static readFile = readFile
}

export class Functions {
  public static get EnvironmentName(): string {
    if (process.env.DB_CLIENT == null || process.env.DB_CLIENT.length < 1) {
      return 'development'
    }
    return process.env.DB_CLIENT
  }

  public static async readConfigurationBlock(): Promise<KnexOptions> {
    const content = await Imports.readFile(join(__dirname, '../knexfile.json'), { encoding: 'utf-8' })
    if (content.length < 1) throw new Error('Invalid Configuration Detected!')
    const data = JSON.parse(content) as unknown
    if (!isDictionary(data)) throw new Error('Invalid Configuration Detected!')
    if (!(Functions.EnvironmentName in data)) throw new Error('Invalid Configuration Detected!')
    const config = data[Functions.EnvironmentName]
    if (!isKnexOptions(config)) throw new Error('Invalid Configuration Detected!')
    return config
  }

  public static async GetKnexConfig(): Promise<KnexOptions> {
    const connection = await Functions.readConfigurationBlock()
    const keys: Array<'host' | 'database' | 'user' | 'password' | 'filename'> = [
      'host',
      'database',
      'user',
      'password',
      'filename',
    ]
    keys.forEach((key) => {
      const value = process.env[`DB_${key.toUpperCase()}`]
      if (value !== undefined) {
        connection.connection[key] = value
      }
    })
    return connection
  }
}

export default {
  initialize: async (): Promise<Knex> => await (Imports.Initializer ??= initialize()),
}
