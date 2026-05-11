'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Confirm, init, show } from '#public/scripts/app/confirm.js'

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

describe('public/app/confirm init()', () => {
  beforeEach(() => {
    const dom = new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' })
    mountDom(dom)
    Confirm.dialogElement = null
    Confirm.titleElement = null
    Confirm.messageElement = null
    Confirm.resolve = undefined
    init()
  })

  afterEach(() => {
    unmountDom()
  })

  it('should set dialogElement to #confirmDialog', () => {
    expect(Confirm.dialogElement).not.toBe(null)
  })

  it('should set messageElement to .message within #confirmDialog', () => {
    expect(Confirm.messageElement).not.toBe(null)
  })

  it('should set titleElement to .title within #confirmDialog', () => {
    expect(Confirm.titleElement).not.toBe(null)
  })

  it('should resolve true when confirm button is clicked', async () => {
    const result = show('test', 'Test Title')
    document.querySelector<HTMLElement>('#confirmDialog .confirm')?.click()
    expect(await result).toBe(true)
  })

  it('should resolve false when cancel button is clicked', async () => {
    const result = show('test', 'Test Title')
    document.querySelector<HTMLElement>('#confirmDialog .cancel')?.click()
    expect(await result).toBe(false)
  })
})
