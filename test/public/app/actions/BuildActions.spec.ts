'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, describe, it } from 'mocha'
import Sinon from 'sinon'

import { Actions } from '../../../../public/scripts/app/actions'

import { Cast } from '../../../../testutils/TypeGuards'
import { resetPubSub } from '../../../../testutils/PubSub'
import { JSDOM } from 'jsdom'
import { render } from 'pug'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div#tabImages
    div#tabFolders
    div#tabActions
    template#ActionCard
      div.card.action-button
        div.card-top
          i.material-icons question_mark
        div.card-body
          h5 placeholder
`

const rowCases = Actions.ActionGroups.flatMap(({ target, buttons }) =>
  buttons.map((row, rowIndex) => ({ target, rowIndex, buttonCount: row.length })),
)

describe('public/app/actions function BuildActions()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  Sinon.stub()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    resetPubSub()
    sandbox.stub(Actions.gamepads, 'Reset')
  })
  afterEach(() => {
    sandbox.restore()
    global.window = existingWindow
    global.document = existingDocument
  })

  Actions.ActionGroups.forEach(({ target, buttons }) => {
    it(`should create ${buttons.length} action rows in ${target}`, () => {
      Actions.BuildActions()
      expect(dom.window.document.querySelectorAll(`${target} .actions`)).to.have.length(buttons.length)
    })
  })

  rowCases.forEach(({ target, rowIndex, buttonCount }) => {
    it(`should make ${target} row ${rowIndex} an HTMLDivElement`, () => {
      Actions.BuildActions()
      const rows = dom.window.document.querySelectorAll(`${target} .actions`)
      expect(rows[rowIndex]).to.be.instanceOf(dom.window.HTMLDivElement)
    })
    it(`should put ${buttonCount} buttons in ${target} row ${rowIndex}`, () => {
      Actions.BuildActions()
      const rows = dom.window.document.querySelectorAll(`${target} .actions`)
      expect(rows[rowIndex]?.children).to.have.length(buttonCount)
    })
  })

  Actions.ActionGroups.forEach(({ target, buttons }) => {
    it(`should create ${buttons.length} action rows in ${target} when called twice`, () => {
      Actions.BuildActions()
      Actions.BuildActions()
      expect(dom.window.document.querySelectorAll(`${target} .actions`)).to.have.length(buttons.length)
    })
  })

  rowCases.forEach(({ target, rowIndex, buttonCount }) => {
    it(`should make ${target} row ${rowIndex} an HTMLDivElement when called twice`, () => {
      Actions.BuildActions()
      Actions.BuildActions()
      const rows = dom.window.document.querySelectorAll(`${target} .actions`)
      expect(rows[rowIndex]).to.be.instanceOf(dom.window.HTMLDivElement)
    })
    it(`should put ${buttonCount} buttons in ${target} row ${rowIndex} when called twice`, () => {
      Actions.BuildActions()
      Actions.BuildActions()
      const rows = dom.window.document.querySelectorAll(`${target} .actions`)
      expect(rows[rowIndex]?.children).to.have.length(buttonCount)
    })
  })
})
