'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, describe, it } from 'mocha'
import Sinon from 'sinon'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Actions } from '../../../../public/scripts/app/actions'

import { Cast } from '../../../testutils/TypeGuards'
import { JSDOM } from 'jsdom'
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
describe('public/app/actions function BuildActions()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  let GamepadResetSpy = Sinon.stub()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    PubSub.subscribers = {}
    PubSub.deferred = []
    PubSub.intervals = {}
    GamepadResetSpy = Sinon.stub(Actions.gamepads, 'Reset')
  })
  afterEach(() => {
    GamepadResetSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should return build actions for each tab', () => {
    Actions.BuildActions()
    for (const { target, buttons } of Actions.ActionGroups) {
      const result = dom.window.document.querySelectorAll(target + ' .actions')
      expect(result).to.have.length(buttons.length, `${target} should have ${buttons.length} rows`)
      for (let i = 0; i < buttons.length; i++) {
        expect(result[i]).to.be.instanceOf(dom.window.HTMLDivElement, `${target} row ${i} should have expected type`)
        expect(result[i]?.children).to.have.length(
          buttons[i]?.length ?? -1,
          `${target} row ${i} should have ${buttons[i]?.length} buttons`,
        )
      }
    }
  })

  it('should be idempotent', () => {
    Actions.BuildActions()
    Actions.BuildActions()
    for (const { target, buttons } of Actions.ActionGroups) {
      const result = dom.window.document.querySelectorAll(target + ' .actions')
      expect(result).to.have.length(buttons.length, `${target} should have ${buttons.length} rows`)
      for (let i = 0; i < buttons.length; i++) {
        expect(result[i]).to.be.instanceOf(dom.window.HTMLDivElement, `${target} row ${i} should have expected type`)
        expect(result[i]?.children).to.have.length(
          buttons[i]?.length ?? -1,
          `${target} row ${i} should have ${buttons[i]?.length} buttons`,
        )
      }
    }
  })
})
