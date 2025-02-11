'use sanity'

const decodeResult = async <T>(response: Response): Promise<T> => {
  if (response.headers.get('content-length') === '0') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO: rewrite to be typesafe...
    return {} as unknown as T
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- TODO: rewrite to be typesafe...
  const data = await response.json()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- TODO: rewrite to be typesafe...
  if (data?.error != null) throw new Error(`${data.error}`)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO: rewrite to be typesafe...
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: rewrite to be typesafe...
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
