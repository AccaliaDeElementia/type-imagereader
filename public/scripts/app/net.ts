'use sanity'

const decodeResult = async <T>(response:Response): Promise<T> => {
  if (response.headers.get('content-length') === '0') {
    return {} as T
  }
  const data = await response.json()
  if (data?.error) throw new Error(data.error)
  return data as T
}

export const GetJSON = <T>(path: string): Promise<T> => fetch(
  path,
  {
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'GET'
  })
  .then(response => decodeResult<T>(response))

export const PostJSON = <T>(path: string, data: any): Promise<T> => fetch(
  path,
  {
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify(data)
  })
  .then(response => decodeResult<T>(response))
