'use sanity'

export interface WeatherResults {
  temp?: number | undefined
  pressure?: number | undefined
  humidity?: number | undefined
  description?: string | undefined
  icon?: string | undefined
  sunrise?: number | undefined
  sunset?: number | undefined
}

function isValidTemps(obj: object): boolean {
  if ('temp' in obj && obj.temp !== undefined && typeof obj.temp !== 'number') return false
  if ('pressure' in obj && obj.pressure !== undefined && typeof obj.pressure !== 'number') return false
  if ('humidity' in obj && obj.humidity !== undefined && typeof obj.humidity !== 'number') return false
  return true
}

function isValidDescriptions(obj: object): boolean {
  if ('description' in obj && obj.description !== undefined && typeof obj.description !== 'string') return false
  if ('icon' in obj && obj.icon !== undefined && typeof obj.icon !== 'string') return false
  return true
}

function isValidSunData(obj: object): boolean {
  if ('sunrise' in obj && obj.sunrise !== undefined && typeof obj.sunrise !== 'number') return false
  if ('sunset' in obj && obj.sunset !== undefined && typeof obj.sunset !== 'number') return false
  return true
}

export function isWeatherResults(obj: unknown): obj is WeatherResults {
  if (obj == null || typeof obj !== 'object' || obj instanceof Array) return false
  return isValidTemps(obj) && isValidDescriptions(obj) && isValidSunData(obj)
}
