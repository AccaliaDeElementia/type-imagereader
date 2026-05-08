'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { Actions } from '#public/scripts/app/actions.js'

import { resetPubSub } from '#testutils/PubSub.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
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
  let dom: JSDOM = new JSDOM('', {})

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    sandbox.stub(Actions.gamepads, 'Reset')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
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
