'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Confirm } from '#public/scripts/app/confirm.js'
import { Cast } from '#testutils/TypeGuards.js'

const markup = `
html
  body
    div#confirmDialog.hidden
      div.dialog-box
        h3.title
        p.message
        div.dialog-buttons
          button.cancel Cancel
          button.confirm Confirm
`

describe('public/app/confirm function Show()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let confirmButton: HTMLElement | null = null
  let cancelButton: HTMLElement | null = null

  beforeEach(() => {
    const dom = new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    Confirm.dialogElement = null
    Confirm.titleElement = null
    Confirm.messageElement = null
    Confirm.resolve = undefined
    Confirm.Init()
    confirmButton = document.querySelector<HTMLElement>('#confirmDialog .confirm')
    cancelButton = document.querySelector<HTMLElement>('#confirmDialog .cancel')
  })

  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })

  it('should remove .hidden from the dialog element', () => {
    void Confirm.Show('test', 'Test Title')
    expect(Confirm.dialogElement?.classList.contains('hidden')).to.equal(false)
  })

  it('should set the message text on the message element', () => {
    const message = 'Are you sure?'
    void Confirm.Show(message, 'Test Title')
    expect(Confirm.messageElement?.innerText).to.equal(message)
  })

  it('should set the title text on the title element', () => {
    const title = 'My Dialog Title'
    void Confirm.Show('test', title)
    expect(Confirm.titleElement?.innerText).to.equal(title)
  })

  it('should resolve true when confirm button is clicked', async () => {
    const result = Confirm.Show('test', 'Test Title')
    confirmButton?.click()
    expect(await result).to.equal(true)
  })

  it('should resolve false when cancel button is clicked', async () => {
    const result = Confirm.Show('test', 'Test Title')
    cancelButton?.click()
    expect(await result).to.equal(false)
  })

  it('should add .hidden to the dialog after confirm button is clicked', async () => {
    const result = Confirm.Show('test', 'Test Title')
    confirmButton?.click()
    await result
    expect(Confirm.dialogElement?.classList.contains('hidden')).to.equal(true)
  })

  it('should add .hidden to the dialog after cancel button is clicked', async () => {
    const result = Confirm.Show('test', 'Test Title')
    cancelButton?.click()
    await result
    expect(Confirm.dialogElement?.classList.contains('hidden')).to.equal(true)
  })

  it('should still set messageElement.innerText when titleElement is null', async () => {
    Confirm.titleElement = null
    const result = Confirm.Show('msg-only', 'unused-title')
    confirmButton?.click()
    await result
    expect(Confirm.messageElement?.innerText).to.equal('msg-only')
  })

  it('should still set titleElement.innerText when messageElement is null', async () => {
    Confirm.messageElement = null
    const result = Confirm.Show('unused-msg', 'title-only')
    confirmButton?.click()
    await result
    expect(Confirm.titleElement?.innerText).to.equal('title-only')
  })
})
