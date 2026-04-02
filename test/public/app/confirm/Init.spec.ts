'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Confirm } from '#public/scripts/app/confirm'
import { Cast } from '#testutils/TypeGuards'

const markup = `
html
  body
    div#confirmDialog.hidden
      div.dialog-box
        p.message
        div.dialog-buttons
          button.cancel Cancel
          button.confirm Confirm
`

describe('public/app/confirm function Init()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document

  beforeEach(() => {
    const dom = new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    Confirm.dialogElement = null
    Confirm.messageElement = null
    Confirm.resolve = undefined
    Confirm.Init()
  })

  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })

  it('should set dialogElement to #confirmDialog', () => {
    expect(Confirm.dialogElement).to.not.equal(null)
  })

  it('should set messageElement to .message within #confirmDialog', () => {
    expect(Confirm.messageElement).to.not.equal(null)
  })

  it('should resolve true when confirm button is clicked', async () => {
    const result = Confirm.Show('test')
    document.querySelector<HTMLElement>('#confirmDialog .confirm')?.click()
    expect(await result).to.equal(true)
  })

  it('should resolve false when cancel button is clicked', async () => {
    const result = Confirm.Show('test')
    document.querySelector<HTMLElement>('#confirmDialog .cancel')?.click()
    expect(await result).to.equal(false)
  })
})
