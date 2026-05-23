'use sanity'

import { Router } from 'express'
import type { Application, Request, Response } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { StatusCodes } from 'http-status-codes'
import debug from 'debug'
import { stringishHasValue } from '#utils/helpers.js'

const KELVIN_TO_CELCIUS_OFFSET = -273.15
const SECONDS_TO_MILLISECONDS_MULTIPLE = 1000
const UPDATE_INTERVAL = 600_000 // Ten Minutes in Milliseconds
const FETCH_TIMEOUT_MS = 60_000 // standard "long-but-bounded" web request timeout
export const DEFAULT_ICON_TTL_MS = 86_400_000 // 24 hours
export const MAX_ICON_TTL_MS = 604_800_000 // 7 days
export const BROWSER_ICON_CACHE_SECONDS = 21_600 // 6 hours
const ICON_CODE_PATTERN = /^\d{2}[dn]$/v
const PASSTHROUGH_UPSTREAM_STATUSES: ReadonlySet<number> = new Set([StatusCodes.FORBIDDEN, StatusCodes.NOT_FOUND])

export interface WeatherResults {
  temp: number | undefined
  pressure: number | undefined
  humidity: number | undefined
  description: string | undefined
  icon: string | undefined
  sunrise: number | undefined
  sunset: number | undefined
}

export interface OpenWeatherData {
  main?: {
    temp: number
    pressure: number
    humidity: number
  }
  weather: Array<{
    main: string
    icon: string
  }>
  sys: {
    sunrise: number
    sunset: number
  }
}

export class WeatherConfigError extends Error {}

export class IconFetchError extends Error {
  public statusCode: number
  constructor(statusCode: number) {
    super(`Icon fetch failed with status ${statusCode}`)
    this.statusCode = statusCode
  }
}

export interface IconCacheEntry {
  buffer: Buffer
  contentType: string
  expiresAt: number
}

export const IconCache: { entries: Map<string, IconCacheEntry> } = {
  entries: new Map<string, IconCacheEntry>(),
}

function isOptionalMainValid(data: object): boolean {
  if ('main' in data) {
    if (typeof data.main !== 'object' || data.main === null) return false
    if (!('temp' in data.main) || typeof data.main.temp !== 'number') return false
    if (!('pressure' in data.main) || typeof data.main.pressure !== 'number') return false
    if (!('humidity' in data.main) || typeof data.main.humidity !== 'number') return false
  }
  return true
}

function isWeatherValid(data: object): boolean {
  if (!('weather' in data) || !Array.isArray(data.weather)) return false
  for (const record of data.weather as unknown[]) {
    if (typeof record !== 'object' || record === null) return false
    if (!('main' in record) || typeof record.main !== 'string') return false
    if (!('icon' in record) || typeof record.icon !== 'string') return false
  }
  return true
}

function isSysValid(data: object): boolean {
  if (!('sys' in data) || typeof data.sys !== 'object' || data.sys === null) return false
  if (!('sunrise' in data.sys) || typeof data.sys.sunrise !== 'number') return false
  if (!('sunset' in data.sys) || typeof data.sys.sunset !== 'number') return false
  return true
}

const DEFAULT_MILLISECONDS = 0
const DEFAULT_SECONDS = 0
const DEFAULT_DAWN_MINUTES = 15
const DEFAULT_DAWN_HOUR = 6
const DEFAULT_DUSK_MINUTES = 0
const DEFAULT_DUSK_HOUR = 21
interface TimeCode {
  hour: number
  minute: number
}
const MIN_HOUR = 0
const MAX_HOUR = 23
const MIN_MINUTES = 0
const MAX_MINUTES = 59
function stringToTimeCode(input: string | undefined): TimeCode | undefined {
  if (input === undefined) return undefined
  const [iHour, iMinute] = input.split(':')
  if (stringishHasValue(iHour)) {
    const hour = Number.parseInt(iHour, 10)
    let minute = MIN_MINUTES
    if (stringishHasValue(iMinute)) {
      minute = Number.parseInt(iMinute, 10)
    }
    if (hour >= MIN_HOUR && hour <= MAX_HOUR && minute >= MIN_MINUTES && minute <= MAX_MINUTES) {
      return { hour, minute }
    }
  }
  return undefined
}
function getTimeOfDay(envVar: string | undefined, defaultHour: number, defaultMinute: number): number {
  const time = new Date()
  time.setMilliseconds(DEFAULT_MILLISECONDS)
  time.setSeconds(DEFAULT_SECONDS)
  time.setMinutes(defaultMinute)
  time.setHours(defaultHour)
  const code = stringToTimeCode(envVar)
  if (code !== undefined) {
    time.setHours(code.hour)
    time.setMinutes(code.minute)
  }
  return time.getTime()
}
export const Imports = {
  getEarliestSunset: (): number => getTimeOfDay(process.env.NIGHT_NOT_BEFORE, DEFAULT_DUSK_HOUR, DEFAULT_DUSK_MINUTES),
  getLatestSunrise: (): number => getTimeOfDay(process.env.NIGHT_NOT_AFTER, DEFAULT_DAWN_HOUR, DEFAULT_DAWN_MINUTES),
  logger: debug('type-imagereader:weather'),
  Router,
}

export const Weather: WeatherResults = {
  temp: undefined,
  pressure: undefined,
  humidity: undefined,
  description: undefined,
  icon: undefined,
  sunrise: undefined,
  sunset: undefined,
}

export function isOpenWeatherData(data: unknown): data is OpenWeatherData {
  if (typeof data !== 'object' || data === null) return false
  if (!isOptionalMainValid(data)) return false
  if (!isWeatherValid(data)) return false
  return isSysValid(data)
}

export async function getWeather(): Promise<OpenWeatherData> {
  const appId = process.env.OPENWEATHER_APPID
  if (!stringishHasValue(appId)) throw new WeatherConfigError('no OpenWeather AppId Defined!')
  const location = encodeURIComponent(process.env.OPENWEATHER_LOCATION ?? '')
  if (!stringishHasValue(location)) throw new WeatherConfigError('no OpenWeather Location Defined!')
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${appId}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  const data: unknown = await response.json()
  if (!isOpenWeatherData(data)) throw new Error('Invalid JSON returned from Open Weather Map')
  return data
}

function parseCacheControlMaxAge(header: string | null): number | undefined {
  if (header === null) return undefined
  const directives = header.split(',').map((part) => part.trim().toLowerCase())
  if (directives.includes('no-store') || directives.includes('no-cache')) return undefined
  for (const directive of directives) {
    const match = /^max-age=(?<seconds>\d+)$/v.exec(directive)
    const raw = match?.groups?.seconds
    if (raw === undefined) continue
    return Number.parseInt(raw, 10) * SECONDS_TO_MILLISECONDS_MULTIPLE
  }
  return undefined
}

function clampTtl(ms: number): number {
  return Math.min(ms, MAX_ICON_TTL_MS)
}

async function fetchIcon(code: string): Promise<{ buffer: Buffer; contentType: string; ttlMs: number }> {
  const response = await fetch(`https://openweathermap.org/img/w/${code}.png`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (PASSTHROUGH_UPSTREAM_STATUSES.has(response.status)) {
    throw new IconFetchError(response.status)
  }
  if (!response.ok) {
    throw new IconFetchError(StatusCodes.BAD_GATEWAY)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') ?? 'image/png'
  const maxAge = Internals.parseCacheControlMaxAge(response.headers.get('cache-control'))
  const ttlMs = Internals.clampTtl(maxAge ?? DEFAULT_ICON_TTL_MS)
  return { buffer, contentType, ttlMs }
}

async function serveIcon(req: Request, res: Response): Promise<void> {
  const code = String(req.params.code)
  if (!ICON_CODE_PATTERN.test(code)) {
    res.status(StatusCodes.BAD_REQUEST).end()
    return
  }
  const now = Date.now()
  const cached = IconCache.entries.get(code)
  if (cached !== undefined && cached.expiresAt > now) {
    sendIconBytes(res, cached)
    return
  }
  try {
    const fresh = await Internals.fetchIcon(code)
    const entry: IconCacheEntry = {
      buffer: fresh.buffer,
      contentType: fresh.contentType,
      expiresAt: now + fresh.ttlMs,
    }
    IconCache.entries.set(code, entry)
    sendIconBytes(res, entry)
  } catch (err) {
    const statusCode = err instanceof IconFetchError ? err.statusCode : StatusCodes.BAD_GATEWAY
    res.status(statusCode).end()
  }
}

function sendIconBytes(res: Response, entry: IconCacheEntry): void {
  res.status(StatusCodes.OK)
  res.set('Content-Type', entry.contentType)
  res.set('Cache-Control', `public, max-age=${BROWSER_ICON_CACHE_SECONDS}`)
  res.send(entry.buffer)
}

export async function updateWeather(): Promise<WeatherResults> {
  const latestSunrise = Imports.getLatestSunrise()
  const earliestSunset = Imports.getEarliestSunset()
  try {
    const data = await Internals.getWeather()
    if (data.main !== undefined) {
      Weather.temp = data.main.temp + KELVIN_TO_CELCIUS_OFFSET
      Weather.pressure = data.main.pressure
      Weather.humidity = data.main.humidity
    }
    const [firstForecast] = data.weather
    Weather.description = firstForecast?.main
    Weather.icon = firstForecast?.icon
    Weather.sunrise = Math.min(SECONDS_TO_MILLISECONDS_MULTIPLE * data.sys.sunrise, latestSunrise)
    Weather.sunset = Math.max(SECONDS_TO_MILLISECONDS_MULTIPLE * data.sys.sunset, earliestSunset)
  } catch (err) {
    if (err instanceof WeatherConfigError) {
      Imports.logger('updateWeather skipped: %s', err.message)
    } else {
      Imports.logger('updateWeather error', err)
    }
    Weather.temp = undefined
    Weather.pressure = undefined
    Weather.humidity = undefined
    Weather.description = undefined
    Weather.icon = undefined
    Weather.sunrise = latestSunrise
    Weather.sunset = earliestSunset
  }
  return Weather
}

const findMissingWeatherConfigVar = (): string | undefined => {
  if (!stringishHasValue(process.env.OPENWEATHER_APPID)) return 'OPENWEATHER_APPID'
  if (!stringishHasValue(process.env.OPENWEATHER_LOCATION)) return 'OPENWEATHER_LOCATION'
  return undefined
}

// Export the base-router
export async function getRouter(_app: Application, _server: Server, _sockets: WebSocketServer): Promise<Router> {
  const router = Imports.Router()

  router.get('/', (_: Request, res: Response): void => {
    res.status(StatusCodes.OK).json(Weather)
  })

  router.get('/icon/:code', (req: Request, res: Response): void => {
    void Internals.serveIcon(req, res)
  })

  const missingVar = findMissingWeatherConfigVar()
  if (missingVar === undefined) {
    setInterval(() => {
      void Internals.updateWeather()
    }, UPDATE_INTERVAL)
    void Internals.updateWeather()
  } else {
    Imports.logger('weather updates disabled: %s is not configured', missingVar)
  }

  await Promise.resolve() // async required by getRouter signature
  return router
}

export const Internals = {
  getWeather,
  updateWeather,
  parseCacheControlMaxAge,
  clampTtl,
  fetchIcon,
  serveIcon,
}
