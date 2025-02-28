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

function isConnectionValid(obj: object): boolean {
  if (!('connection' in obj) || obj.connection == null || typeof obj.connection !== 'object') return false
  const entries = Object.entries(obj.connection)
  for (const key of ['host', 'database', 'user', 'password', 'filename']) {
    const value = entries.find(([k]) => k === key)
    if (value != null && typeof value[1] !== 'string') return false
  }
  return true
}

function isPoolValid(obj: object): boolean {
  if (!('pool' in obj)) return true
  if (obj.pool == null || typeof obj.pool !== 'object') return false
  if (!('min' in obj.pool) || typeof obj.pool.min !== 'number') return false
  if (!('max' in obj.pool) || typeof obj.pool.max !== 'number') return false
  return true
}

function isMigrationsValid(obj: object): boolean {
  if (!('migrations' in obj) || obj.migrations == null || typeof obj.migrations !== 'object') return false
  if (!('tableName' in obj.migrations) || typeof obj.migrations.tableName !== 'string') return false
  return true
}

export function isKnexOptions(obj: unknown): obj is KnexOptions {
  if (obj == null || typeof obj !== 'object') return false
  if (!('client' in obj) || typeof obj.client !== 'string') return false
  if (!isConnectionValid(obj)) return false
  if ('useNullAsDefault' in obj && typeof obj.useNullAsDefault !== 'boolean') return false
  if (!isPoolValid(obj)) return false
  if (!isMigrationsValid(obj)) return false
  return true
}

export function isDictionary(obj: unknown): obj is Record<string, unknown> {
  if (obj == null || typeof obj !== 'object') return false
  return true
}

const CreateInitializer = (): Promise<Knex> | undefined => undefined
export const Imports = { knex, Initializer: CreateInitializer(), readFile }

export const Functions = {
  getEnvironmentName: (): string => {
    if (process.env.DB_CLIENT == null || process.env.DB_CLIENT.length < 1) {
      return 'development'
    }
    return process.env.DB_CLIENT
  },
  readConfigurationBlock: async (): Promise<KnexOptions> => {
    const content = await Imports.readFile(join(__dirname, '../knexfile.json'), { encoding: 'utf-8' })
    if (content.length < 1) throw new Error('Invalid Configuration Detected!')
    const data = JSON.parse(content) as unknown
    if (!isDictionary(data)) throw new Error('Invalid Configuration Detected!')
    const name = Functions.getEnvironmentName()
    if (!(name in data)) throw new Error('Invalid Configuration Detected!')
    const config = data[name]
    if (!isKnexOptions(config)) throw new Error('Invalid Configuration Detected!')
    return config
  },
  GetKnexConfig: async (): Promise<KnexOptions> => {
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
  },
}

export default {
  initialize: async (): Promise<Knex> => await (Imports.Initializer ??= initialize()),
}
