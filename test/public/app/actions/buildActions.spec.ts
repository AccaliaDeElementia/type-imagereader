'use sanity'

import { Actions, Internals } from '#public/scripts/app/actions.js'

import { resetPubSub } from '#testutils/pubsub.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

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

describe('public/app/actions buildActions()', () => {
  let dom: JSDOM = new JSDOM('', {})

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    vi.spyOn(Actions.gamepads, 'reset').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    unmountDom()
  })

  Actions.ActionGroups.forEach(({ target, buttons }) => {
    it(`should create ${buttons.length} action rows in ${target}`, () => {
      Internals.buildActions()
      expect(dom.window.document.querySelectorAll(`${target} .actions`)).toHaveLength(buttons.length)
    })
  })

  rowCases.forEach(({ target, rowIndex, buttonCount }) => {
    it(`should make ${target} row ${rowIndex} an HTMLDivElement`, () => {
      Internals.buildActions()
      const rows = dom.window.document.querySelectorAll(`${target} .actions`)
      expect(rows[rowIndex]).toBeInstanceOf(dom.window.HTMLDivElement)
    })
    it(`should put ${buttonCount} buttons in ${target} row ${rowIndex}`, () => {
      Internals.buildActions()
      const rows = dom.window.document.querySelectorAll(`${target} .actions`)
      expect(rows[rowIndex]?.children).toHaveLength(buttonCount)
    })
  })

  Actions.ActionGroups.forEach(({ target, buttons }) => {
    it(`should create ${buttons.length} action rows in ${target} when called twice`, () => {
      Internals.buildActions()
      Internals.buildActions()
      expect(dom.window.document.querySelectorAll(`${target} .actions`)).toHaveLength(buttons.length)
    })
  })

  rowCases.forEach(({ target, rowIndex, buttonCount }) => {
    it(`should make ${target} row ${rowIndex} an HTMLDivElement when called twice`, () => {
      Internals.buildActions()
      Internals.buildActions()
      const rows = dom.window.document.querySelectorAll(`${target} .actions`)
      expect(rows[rowIndex]).toBeInstanceOf(dom.window.HTMLDivElement)
    })
    it(`should put ${buttonCount} buttons in ${target} row ${rowIndex} when called twice`, () => {
      Internals.buildActions()
      Internals.buildActions()
      const rows = dom.window.document.querySelectorAll(`${target} .actions`)
      expect(rows[rowIndex]?.children).toHaveLength(buttonCount)
    })
  })
})
