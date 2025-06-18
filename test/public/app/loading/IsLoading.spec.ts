'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Loading } from '../../../../public/scripts/app/loading'
import { Cast } from '../../../testutils/TypeGuards'

const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading function IsLoading()"', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    PubSub.subscribers = {}
    PubSub.deferred = []
    Loading.overlay = null
    Loading.navbar = null
    Loading.Init()
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
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
    it(`should ${expected ? '' : 'not '}consider ${style} as IsLoading`, () => {
      const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
      overlay?.style.setProperty('display', style)
      expect(Loading.IsLoading()).to.equal(expected)
    })
  })
})
