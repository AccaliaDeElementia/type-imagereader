'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, init, isLoading, Loading } from '#public/scripts/app/loading.js'
import { resetPubSub } from '#testutils/pubsub.js'

const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading isLoading()', () => {
  let dom: JSDOM = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    // init() registers four Loading:* subscribers as a side effect of populating
    // Loading.overlay/navbar — not part of isLoading's behavior surface. Stubbed
    // here to absorb the registrations; captured and asserted in init.spec.ts
    // (registration) and the per-handler specs (error, success, showHide).
    vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
    Loading.overlay = null
    Loading.navbar = null
    init()
  })
  afterEach(() => {
    unmountDom()
  })
  const testCases: Array<[string, boolean]> = [
    ['inline', false],
    ['block', true],
    ['contents', false],
    ['flex', false],
    ['grid', false],
    ['inline-block', false],
    ['inline-flex', false],
    ['inline-grid', false],
    ['inline-table', false],
    ['list-item', false],
    ['run-in', false],
    ['table', false],
    ['table-caption', false],
    ['table-column-group', false],
    ['table-header-group', false],
    ['table-footer-group', false],
    ['table-row-group', false],
    ['table-cell', false],
    ['table-column', false],
    ['table-row', false],
    ['none', false],
    ['initial', false],
    ['inherit', false],
  ]
  testCases.forEach(([style, expected]) => {
    it(`should ${expected ? '' : 'not '}consider ${style} as isLoading`, () => {
      const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
      overlay?.style.setProperty('display', style)
      expect(isLoading()).toBe(expected)
    })
  })
})
