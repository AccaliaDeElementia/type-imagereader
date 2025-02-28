'use sanity'

interface JSONError {
  error: string
}

function isError(obj: unknown): obj is JSONError {
  if (typeof obj !== 'object' || obj == null) return false
  if (!('error' in obj) || typeof obj.error !== 'string') return false
  return true
}

const decodeResult = async <T>(response: Response, isT: (obj: unknown) => obj is T): Promise<T> => {
  if (response.headers.get('content-length') === '0') throw new Error('Empty JSON response recieved')
  const data = (await response.json()) as unknown
  if (isError(data)) throw new Error(data.error)
  if (!isT(data) || data == null) throw new Error('Invalid JSON object decoded')
  return data
}

export const Net = {
  GetJSON: async <T>(path: string, isT: (obj: unknown) => obj is T): Promise<T> =>
    await fetch(path, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'GET',
    }).then(async (response) => await decodeResult<T>(response, isT)),
  PostJSON: async <T>(path: string, data: unknown, isT: (obj: unknown) => obj is T): Promise<T> =>
    await fetch(path, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(data),
    }).then(async (response) => await decodeResult<T>(response, isT)),
}
