'use sanity'

import { Internals } from '#public/scripts/slideshow/weather.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

const markup = `
html
  body
    div.text.weather(style='display: none')
      div.temp
      div.desc
        span.desctext
        img.icon
`

describe('public/slideshow/weather showData()', () => {
  let dom = new JSDOM('')
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
  })
  afterEach(() => {
    unmountDom()
  })

  const missingContainers: Array<[string, null | undefined]> = [
    ['null', null],
    ['undefined', undefined],
  ]
  it.each(missingContainers)(
    'should not write the text into the element when the container is %s',
    (_title, container) => {
      const element = dom.window.document.querySelector<HTMLElement>('.weather .temp')
      Internals.showData(container, element, 'FOO')
      expect(element?.innerHTML).toBe('')
    },
  )

  const noDisplayTests: Array<[string, null | undefined]> = [
    ['null element', null],
    ['undefined element', undefined],
  ]
  noDisplayTests.forEach(([title, element]) => {
    it(`should not set display style with ${title}`, () => {
      const base = dom.window.document.querySelector<HTMLElement>('.weather')
      base?.style.removeProperty('display')
      Internals.showData(base, element, 'FOO')
      expect(base?.style.getPropertyValue('display')).toBe('')
    })
  })

  const noneDisplayTests: Array<[string, string | null | undefined]> = [
    ['null input', null],
    ['undefined input', undefined],
    ['empty input', ''],
  ]
  noneDisplayTests.forEach(([title, input]) => {
    it(`should set display:none style with ${title}`, () => {
      const base = dom.window.document.querySelector<HTMLElement>('.weather')
      base?.style.setProperty('display', 'Foo!')
      const element = base?.querySelector<HTMLElement>('.desctext')
      Internals.showData(base, element, input)
      expect(base?.style.getPropertyValue('display')).toBe('none')
    })
  })

  it('should not clear existing element content for empty string input', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const element = base?.querySelector<HTMLElement>('.desctext')
    if (element !== null && element !== undefined) element.innerHTML = 'existing content'
    Internals.showData(base, element, '')
    expect(element?.innerHTML).toBe('existing content')
  })

  it('should set display:flex style with stringy input', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    base?.style.setProperty('display', 'Foo!')
    const element = base?.querySelector<HTMLElement>('.desctext')
    Internals.showData(base, element, 'foo!')
    expect(base?.style.getPropertyValue('display')).toBe('flex')
  })

  it('should place the text node with stringy input', () => {
    const base = dom.window.document.querySelector<HTMLElement>('.weather')
    const element = base?.querySelector<HTMLElement>('.desctext')
    const value = `Foo Data ${Math.random()}`
    Internals.showData(base, element, value)
    expect(element?.innerHTML).toBe(value)
  })
})
