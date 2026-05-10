'use sanity'

import { Routers } from '#server.js'

import { getRouter as getApiRouter } from '#routes/api.js'
import { getRouter as getImagesRouter } from '#routes/images.js'
import { getRouter as getRootRouter } from '#routes/root.js'
import { getRouter as getSlideshowRouter } from '#routes/slideshow.js'
import { getRouter as getWeatherRouter } from '#routes/weather.js'

describe('Server registerRouters', () => {
  it('should store root router', () => {
    expect(Routers.Root).toBe(getRootRouter)
  })
  it('should store api router', () => {
    expect(Routers.Api).toBe(getApiRouter)
  })
  it('should store images router', () => {
    expect(Routers.Images).toBe(getImagesRouter)
  })
  it('should store slideshow router', () => {
    expect(Routers.Slideshow).toBe(getSlideshowRouter)
  })
  it('should store weather router', () => {
    expect(Routers.Weather).toBe(getWeatherRouter)
  })
})
