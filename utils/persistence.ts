'use sanity'

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Knex } from 'knex'
import knex from 'knex'
import { stringishHasValue, stringIsNullOrEmpty } from './helpers.js'

const moduleDir = dirname(fileURLToPath(import.meta.url))

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

export function isDictionary(obj: unknown): obj is Record<string, unknown> {
  if (obj === null || typeof obj !== 'object' || obj instanceof Array) return false
  return true
}

export function isConnectionValid(obj: object): boolean {
  if (!('connection' in obj) || !isDictionary(obj.connection)) return false
  const entries = Object.entries(obj.connection)
  for (const key of ['host', 'database', 'user', 'password', 'filename']) {
    const entry = entries.find(([k]) => k === key)
    if (entry === undefined) continue
    const [, value] = entry
    if (typeof value !== 'string') return false
  }
  return true
}

export function isPoolValid(obj: object): boolean {
  if (!('pool' in obj)) return true
  if (!isDictionary(obj.pool)) return false
  if (!('min' in obj.pool) || typeof obj.pool.min !== 'number') return false
  if (!('max' in obj.pool) || typeof obj.pool.max !== 'number') return false
  if (obj.pool.min > obj.pool.max) return false
  return true
}

export function isMigrationsValid(obj: object): boolean {
  if (!('migrations' in obj) || !isDictionary(obj.migrations)) return false
  if (!('tableName' in obj.migrations) || typeof obj.migrations.tableName !== 'string') return false
  return true
}

export function isKnexOptions(obj: unknown): obj is KnexOptions {
  if (!isDictionary(obj)) return false
  if (!('client' in obj) || typeof obj.client !== 'string') return false
  if (!Internals.isConnectionValid(obj)) return false
  if ('useNullAsDefault' in obj && typeof obj.useNullAsDefault !== 'boolean') return false
  if (!Internals.isPoolValid(obj)) return false
  if (!Internals.isMigrationsValid(obj)) return false
  return true
}

export function getEnvironmentName(): string {
  if (!stringishHasValue(process.env.DB_CLIENT)) {
    return 'development'
  }
  return process.env.DB_CLIENT
}

export async function readConfigurationBlock(): Promise<KnexOptions> {
  const content = await Imports.readFile(join(moduleDir, '../knexfile.json'), { encoding: 'utf-8' })
  if (stringIsNullOrEmpty(content)) throw new Error('Invalid Configuration Detected!')
  const data = JSON.parse(content) as unknown
  if (!isDictionary(data)) throw new Error('Invalid Configuration Detected!')
  const name = Internals.getEnvironmentName()
  if (!(name in data)) throw new Error('Invalid Configuration Detected!')
  const config = data[name]
  if (!isKnexOptions(config)) throw new Error('Invalid Configuration Detected!')
  return config
}

export async function getKnexConfig(): Promise<KnexOptions> {
  const connection = await Internals.readConfigurationBlock()
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

export async function initialize(): Promise<Knex> {
  Persistence.initializer ??= doInitialize()
  return await Persistence.initializer
}

async function doInitialize(): Promise<Knex> {
  const config = await Internals.getKnexConfig()
  const knexInstance = Imports.knex(config)
  await knexInstance.migrate.latest()
  return knexInstance
}

export const Persistence = { initializer: undefined as Promise<Knex> | undefined }

export const Imports = { knex, readFile }

export const Internals = {
  getEnvironmentName,
  readConfigurationBlock,
  getKnexConfig,
  isConnectionValid,
  isPoolValid,
  isMigrationsValid,
}
