'use sanity'

import { expect } from 'chai'
import { Routers } from '../../Server'

import { getRouter as getApiRouter } from '../../routes/api'
import { getRouter as getImagesRouter } from '../../routes/images'
import { getRouter as getRootRouter } from '../../routes/index'
import { getRouter as getSlideshowRouter } from '../../routes/slideshow'
import { getRouter as getWeatherRouter } from '../../routes/weather'

describe('Server function RegisterRouters', () => {
  it('should store root router', () => {
    expect(Routers.Root).to.equal(getRootRouter)
  })
  it('should store api router', () => {
    expect(Routers.Api).to.equal(getApiRouter)
  })
  it('should store images router', () => {
    expect(Routers.Images).to.equal(getImagesRouter)
  })
  it('should store slideshow router', () => {
    expect(Routers.Slideshow).to.equal(getSlideshowRouter)
  })
  it('should store weather router', () => {
    expect(Routers.Weather).to.equal(getWeatherRouter)
  })
})
