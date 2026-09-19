'use sanity'

import { hasOptionalKey } from '#utils/typeGuards.js'

export interface WeatherResults {
  temp?: number | undefined
  pressure?: number | undefined
  humidity?: number | undefined
  description?: string | undefined
  icon?: string | undefined
  sunrise?: number | undefined
  sunset?: number | undefined
}

const isString = (v: unknown): boolean => typeof v === 'string'

function isValidTemps(obj: object): boolean {
  if (!hasOptionalKey(obj, 'temp', Number.isFinite)) return false
  if (!hasOptionalKey(obj, 'pressure', Number.isFinite)) return false
  if (!hasOptionalKey(obj, 'humidity', Number.isFinite)) return false
  return true
}

function isValidDescriptions(obj: object): boolean {
  if (!hasOptionalKey(obj, 'description', isString)) return false
  if (!hasOptionalKey(obj, 'icon', isString)) return false
  return true
}

function isValidSunData(obj: object): boolean {
  if (!hasOptionalKey(obj, 'sunrise', Number.isFinite)) return false
  if (!hasOptionalKey(obj, 'sunset', Number.isFinite)) return false
  return true
}

export function isWeatherResults(obj: unknown): obj is WeatherResults {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return false
  return isValidTemps(obj) && isValidDescriptions(obj) && isValidSunData(obj)
}
