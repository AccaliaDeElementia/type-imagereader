'use sanity'

import { expect } from 'chai'
import { suite, test, slow } from '@testdeck/mocha'
import type Sinon from 'sinon'
import * as sinon from 'sinon'

import type { Socket } from 'socket.io'
import { Server as WebSocketServer } from 'socket.io'
import type { DefaultEventsMap } from 'socket.io/dist/typed-events'
import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { WebSockets } from '../../../public/scripts/slideshow/sockets'

type Websocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>

type OnWebsocketConnect = (socket: Websocket) => Promise<void>

const markup = `
html
  body
    img.mainImage.topImage
    img.mainImage.bottomImage.blur
    img.mainImage.bottomImage
`

@suite(slow(250))
export class SlideshowSocketsTests extends WebSockets {
  socketServer: WebSocketServer
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  dom: JSDOM

  constructor () {
    super()
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.socketServer = new WebSocketServer()
    this.dom = new JSDOM('')
  }

  before (): void {
    this.socketServer = new WebSocketServer()
    this.socketServer.listen(2999)
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999'
    })
    this.existingWindow = global.window
    global.window = (this.dom.window as unknown) as Window & typeof globalThis
    this.existingDocument = global.document
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => this.dom.window.document
    })
  }

  async after (): Promise<void> {
    global.window = this.existingWindow
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => this.existingDocument
    })
    WebSockets.disconnect()
    await new Promise<void>((resolve, reject) => {
      this.socketServer.close((err) => {
        if (err != null) {
          reject(err)
        } else {
          resolve()
        }
      }).catch(() => {
        reject(new Error('Socket Close Failed!'))
      })
    })
  }

  async connectSocket (onConnect: OnWebsocketConnect): Promise<void> {
    const result = new Promise<void>((resolve, reject) => {
      this.socketServer.on('connection', (socket) => {
        onConnect(socket).then(resolve, reject)
      })
    })
    WebSockets.connect()
    await result
  }

  @test
  async 'it should reset launchId' (): Promise<void> {
    WebSockets.launchId = 8472
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        socket.on('join-slideshow', () => { resolve() })
      })
    })
    expect(WebSockets.launchId).to.equal(undefined)
  }

  @test
  async 'it should reset LocationAssign' (): Promise<void> {
    WebSockets.LocationAssign = undefined
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        socket.on('join-slideshow', () => { resolve() })
      })
    })
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(WebSockets.LocationAssign).to.equal(this.dom.window.location.assign)
  }

  @test
  async 'it should reset LocationReload' (): Promise<void> {
    WebSockets.LocationReload = undefined
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        socket.on('join-slideshow', () => { resolve() })
      })
    })
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(WebSockets.LocationReload).to.equal(this.dom.window.location.reload)
  }

  @test
  async 'emits join-slideshow on connection' (): Promise<void> {
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        socket.on('join-slideshow', () => { resolve() })
      })
    })
  }

  @test
  async 'emits join-slideshow on connection with default path' (): Promise<void> {
    let connectedRoom: string | undefined
    this.dom.reconfigure({
      url: 'http://127.0.0.1:2999/slideshow'
    })
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        socket.on('join-slideshow', (value) => {
          connectedRoom = value
          resolve()
        })
      })
    })
    expect(connectedRoom).to.equal('/')
  }

  @test
  async 'emits join-slideshow on connection with laoded path' (): Promise<void> {
    let connectedRoom: string | undefined
    const expectedPath = `/${Math.random()}`
    this.dom.reconfigure({
      url: 'http://127.0.0.1:2999/slideshow' + expectedPath
    })
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        socket.on('join-slideshow', (value) => {
          connectedRoom = value
          resolve()
        })
      })
    })
    expect(connectedRoom).to.equal(expectedPath)
  }

  @test
  async 'emits get-launchId on connection' (): Promise<void> {
    const spy = sinon.stub()
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        socket.on('get-launchId', () => {
          spy()
          resolve()
        })
      })
    })
    expect(spy.callCount).to.equal(1)
  }

  @test
  async 'get-launchId sets launch Id when starting' (): Promise<void> {
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        WebSockets.launchId = undefined
        socket.on('get-launchId', (fn) => { fn(3) })
        socket.on('notify-done', () => { resolve() })
      })
    })
    expect(WebSockets.launchId).to.equal(3)
  }

  @test
  async 'get-launchId no-ops when launchId matches' (): Promise<void> {
    let spy: Sinon.SinonStub | undefined
    try {
      await this.connectSocket(async socket => {
        await new Promise<void>(resolve => {
          WebSockets.launchId = 7
          spy = sinon.stub(WebSockets, 'LocationReload')
          socket.on('get-launchId', (fn) => { fn(7) })
          socket.on('notify-done', () => { resolve() })
        })
      })
      expect(WebSockets.launchId).to.equal(7)
      expect(spy?.callCount).to.equal(0)
    } finally {
      spy?.restore()
    }
  }

  @test
  async 'get-launchId reloads page when launchId mismatches' (): Promise<void> {
    let spy: Sinon.SinonStub | undefined
    try {
      await this.connectSocket(async socket => {
        await new Promise<void>(resolve => {
          WebSockets.launchId = 7
          spy = sinon.stub(WebSockets, 'LocationReload')
          socket.on('get-launchId', (fn) => { fn(42) })
          socket.on('notify-done', () => { resolve() })
        })
      })
      expect(WebSockets.launchId).to.equal(42)
      expect(spy?.callCount).to.equal(1)
    } finally {
      spy?.restore()
    }
  }

  @test
  async 'new-image - non-gif image unhides all images' (): Promise<void> {
    for (const img of this.dom.window.document.querySelectorAll('img')) {
      img.classList.add('hide')
    }

    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        socket.emit('new-image', '/some/image.png')
        socket.on('notify-done', resolve)
      })
    })

    for (const img of this.dom.window.document.querySelectorAll('img')) {
      expect(img.classList.contains('hide')).to.equal(false)
    }
  }

  @test
  async 'new-image - gif image hides all background images' (): Promise<void> {
    for (const img of this.dom.window.document.querySelectorAll('img')) {
      img.classList.add('hide')
    }

    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        socket.emit('new-image', '/some/image.gif')
        socket.on('notify-done', resolve)
      })
    })

    for (const img of this.dom.window.document.querySelectorAll('img.bottomImage')) {
      expect(img.classList.contains('hide')).to.equal(true)
    }
    for (const img of this.dom.window.document.querySelectorAll('img.topImage')) {
      expect(img.classList.contains('hide')).to.equal(false)
    }
  }

  @test
  async 'new-image - non-gif sets all sources' (): Promise<void> {
    for (const img of this.dom.window.document.querySelectorAll('img')) {
      img.removeAttribute('src')
    }

    const imagePath = `/${Math.random()}.png`

    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        socket.emit('new-image', imagePath)
        socket.on('notify-done', resolve)
      })
    })

    for (const img of this.dom.window.document.querySelectorAll('img')) {
      expect(img.getAttribute('src')).to.equal(`/images/kiosk${imagePath}-image.webp`)
    }
  }

  @test
  async 'new-image - gif sets only front source' (): Promise<void> {
    for (const img of this.dom.window.document.querySelectorAll('img')) {
      img.removeAttribute('src')
    }

    const imagePath = `/${Math.random()}.gif`

    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        socket.emit('new-image', imagePath)
        socket.on('notify-done', resolve)
      })
    })

    for (const img of this.dom.window.document.querySelectorAll('img.bottomImage')) {
      expect(img.getAttribute('src')).to.equal(null)
    }
    for (const img of this.dom.window.document.querySelectorAll('img.topImage')) {
      expect(img.getAttribute('src')).to.equal(`/images/kiosk${imagePath}-image.webp`)
    }
  }

  @test
  async 'new-image - gif detection is case insensitive' (): Promise<void> {
    for (const img of this.dom.window.document.querySelectorAll('img')) {
      img.removeAttribute('src')
    }

    const imagePath = `/${Math.random()}.GIF`

    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        socket.emit('new-image', imagePath)
        socket.on('notify-done', resolve)
      })
    })

    for (const img of this.dom.window.document.querySelectorAll('img.bottomImage')) {
      expect(img.getAttribute('src')).to.equal(null)
    }
    for (const img of this.dom.window.document.querySelectorAll('img.topImage')) {
      expect(img.getAttribute('src')).to.equal(`/images/kiosk${imagePath}-image.webp`)
    }
  }

  @test
  async 'click handler - previous image active region navigates' (): Promise<void> {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth * (1 / 6),
      clientY: global.window.innerHeight / 2
    })
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        global.document.body.dispatchEvent(event)
        socket.on('prev-image', resolve)
      })
    })
  }

  @test
  async 'click handler - next image active region navigates' (): Promise<void> {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth * (5 / 6),
      clientY: global.window.innerHeight / 2
    })
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        global.document.body.dispatchEvent(event)
        socket.on('next-image', resolve)
      })
    })
  }

  @test
  async 'click handler - navigate to image active region navigates' (): Promise<void> {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth / 2,
      clientY: global.window.innerHeight / 2
    })
    const folder = `/${Math.random()}`
    let assignStub: Sinon.SinonStub = sinon.stub()

    try {
      await this.connectSocket(async socket => {
        assignStub = sinon.stub(WebSockets, 'LocationAssign')
        await new Promise<void>(resolve => {
          global.document.body.dispatchEvent(event)
          socket.on('goto-image', (fn) => fn(folder))
          socket.on('notify-done', resolve)
        })
      })
      expect(assignStub?.calledOnceWithExactly(`/show${folder}?noMenu`)).to.equal(true)
    } finally {
      assignStub?.restore()
    }
  }

  @test
  async 'click handler - Kiosk mode changes navigate image active region to next-image' (): Promise<void> {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth / 2,
      clientY: global.window.innerHeight / 2
    })
    this.dom.reconfigure({
      url: 'http://127.0.0.1:2999/slideshow?kiosk'
    })
    await this.connectSocket(async socket => {
      await new Promise<void>((resolve, reject) => {
        global.document.body.dispatchEvent(event)
        socket.on('goto-image', () => { reject(new Error()) })
        socket.on('next-image', resolve)
      })
    })
  }

  @test
  async 'click handler - Zoomed Viewport ignores previous image activation' (): Promise<void> {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth * (1 / 6),
      clientY: global.window.innerHeight / 2
    })
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        global.window.visualViewport = {
          scale: 1.5
        } as unknown as VisualViewport
        global.document.body.dispatchEvent(event)
        socket.on('notify-done', resolve)
      })
    })
  }

  @test
  async 'click handler - Zoomed Viewport ignores navigate image activation' (): Promise<void> {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth / 2,
      clientY: global.window.innerHeight / 2
    })
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        global.window.visualViewport = {
          scale: 1.5
        } as unknown as VisualViewport
        global.document.body.dispatchEvent(event)
        socket.on('notify-done', resolve)
      })
    })
  }

  @test
  async 'click handler - Zoomed Viewport ignores next image activation' (): Promise<void> {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth * (5 / 6),
      clientY: global.window.innerHeight / 2
    })
    global.window.visualViewport = {
      scale: 1
    } as unknown as VisualViewport
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        global.window.visualViewport = {
          scale: 1.5
        } as unknown as VisualViewport
        global.document.body.dispatchEvent(event)
        socket.on('notify-done', resolve)
      })
    })
  }

  @test
  async 'keyup handler - Non Watched Keypress Ignored' (): Promise<void> {
    const event = new global.window.KeyboardEvent('keyup', {
      key: 'A'
    })
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        global.document.body.dispatchEvent(event)
        socket.on('notify-done', resolve)
      })
    })
  }

  @test
  async 'keyup handler - ArrowLeft triggers prev-image' (): Promise<void> {
    const event = new global.window.KeyboardEvent('keyup', {
      key: 'ArrowLeft'
    })
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        global.document.body.dispatchEvent(event)
        socket.on('prev-image', resolve)
      })
    })
  }

  @test
  async 'keyup handler - ArrowRight triggers next-image' (): Promise<void> {
    const event = new global.window.KeyboardEvent('keyup', {
      key: 'ArrowRight'
    })
    await this.connectSocket(async socket => {
      await new Promise<void>(resolve => {
        global.document.body.dispatchEvent(event)
        socket.on('next-image', resolve)
      })
    })
  }
}
