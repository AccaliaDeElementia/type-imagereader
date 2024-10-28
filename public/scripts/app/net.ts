'use sanity'

const decodeResult = async <T>(response: Response): Promise<T> => {
  if (response.headers.get('content-length') === '0') {
    return {} as unknown as T
  }
  const data = await response.json()
  if (data?.error != null) throw new Error(`${data.error}`)
  return data as T
}

export class Net {
  static async GetJSON<T> (path: string): Promise<T> {
    return await fetch(
      path,
      {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'GET'
      })
      .then(async response => await decodeResult<T>(response))
  }

  static async PostJSON<T> (path: string, data: any): Promise<T> {
    return await fetch(path,
      {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(data)
      })
      .then(async response => await decodeResult<T>(response))
  }
}
