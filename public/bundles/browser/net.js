'use sanity'

const getJSON = path => fetch(
  path,
  {
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'GET'
  })
  .then(response => response.json())
  .then(data => new Promise((resolve, reject) => {
    if (data.error) return reject(data.error)
    resolve(data)
  }))

module.exports = {
  getListing: path => getJSON(`/api/listing${path}`),
  getJSON,
  postJSON: (uri, data) => fetch(
    uri,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(data)
    })
}
