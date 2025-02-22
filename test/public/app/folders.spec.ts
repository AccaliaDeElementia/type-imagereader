'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../public/scripts/app/pubsub'
import type { Folder } from '../../../public/scripts/app/folders'
import { Folders, isData, isFolder } from '../../../public/scripts/app/folders'
import assert from 'assert'
import { Cast } from '../../testutils/TypeGuards'

const markup = `
html
  head
    title
  body
    div
      a.navbar-brand
      a.menuButton
    div#mainMenu
      div#tabLink
        a(href="#tabFolders") Folders
      div#tabFolders
    template#FolderCard
      div.card
        div.card-top
          i.material-icons folder
        div.card-body
          h5 placeholder
        div.progress
          div.text placeholder%
          div.slider(style="width: 0")
`

@suite
export class FoldersIsFolderTests {
  @test
  'it should reject null object'(): void {
    const obj = null
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject undefined object'(): void {
    const obj = undefined
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject non object object'(): void {
    const obj = ''
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject null name object'(): void {
    const obj = {
      name: null,
      path: '',
      cover: '',
      totalSeen: 0,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject undefined name object'(): void {
    const obj = {
      name: undefined,
      path: '',
      cover: '',
      totalSeen: 0,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject miasing name object'(): void {
    const obj = {
      path: '',
      cover: '',
      totalSeen: 0,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject non string name object'(): void {
    const obj = {
      name: {},
      path: '',
      cover: '',
      totalSeen: 0,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject null path object'(): void {
    const obj = {
      name: '',
      path: null,
      cover: '',
      totalSeen: 0,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject undefined path object'(): void {
    const obj = {
      name: '',
      path: undefined,
      cover: '',
      totalSeen: 0,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject missing path object'(): void {
    const obj = {
      name: '',
      cover: '',
      totalSeen: 0,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject non string path object'(): void {
    const obj = {
      name: '',
      path: {},
      cover: '',
      totalSeen: 0,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject undefined cover object'(): void {
    const obj = {
      name: '',
      path: '',
      cover: undefined,
      totalSeen: 0,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject non string cover object'(): void {
    const obj = {
      name: '',
      path: '',
      cover: {},
      totalSeen: 0,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject null totalSeen object'(): void {
    const obj = {
      name: '',
      path: '',
      cover: '',
      totalSeen: null,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject undefined totalSeen object'(): void {
    const obj = {
      name: '',
      path: '',
      cover: '',
      totalSeen: undefined,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject missing totalSeen object'(): void {
    const obj = {
      name: '',
      path: '',
      cover: '',
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject non number totalSeen object'(): void {
    const obj = {
      name: '',
      path: '',
      cover: '',
      totalSeen: '0',
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject null totalCount object'(): void {
    const obj = {
      name: '',
      path: '',
      cover: '',
      totalSeen: 0,
      totalCount: null,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject undefined totalCount object'(): void {
    const obj = {
      name: '',
      path: '',
      cover: '',
      totalSeen: 0,
      totalCount: undefined,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject missing totalCount object'(): void {
    const obj = {
      name: '',
      path: '',
      cover: '',
      totalSeen: 0,
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should reject non number totalCount object'(): void {
    const obj = {
      name: '',
      path: '',
      cover: '',
      totalSeen: 0,
      totalCount: '0',
    }
    expect(isFolder(obj)).to.equal(false)
  }

  @test
  'it should accept base object'(): void {
    const obj = {
      name: '',
      path: '',
      cover: '',
      totalSeen: 0,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(true)
  }

  @test
  'it should accept alternat base object'(): void {
    const obj = {
      name: '',
      path: '',
      cover: null,
      totalSeen: 0,
      totalCount: 0,
    }
    expect(isFolder(obj)).to.equal(true)
  }
}

@suite
export class FolderIsDataTests {
  @test
  'it should reject null object'(): void {
    const obj = null
    expect(isData(obj)).to.equal(false)
  }

  @test
  'it should reject undefined object'(): void {
    const obj = undefined
    expect(isData(obj)).to.equal(false)
  }

  @test
  'it should reject non object object'(): void {
    const obj = '{}'
    expect(isData(obj)).to.equal(false)
  }

  @test
  'it should reject null children object'(): void {
    const obj = {
      children: null,
    }
    expect(isData(obj)).to.equal(false)
  }

  @test
  'it should reject undefined children object'(): void {
    const obj = {
      children: undefined,
    }
    expect(isData(obj)).to.equal(false)
  }

  @test
  'it should reject non array children object'(): void {
    const obj = {
      children: '[]',
    }
    expect(isData(obj)).to.equal(false)
  }

  @test
  'it should reject invalid children array object'(): void {
    const obj = {
      children: [0],
    }
    expect(isData(obj)).to.equal(false)
  }

  @test
  'it should reject null pictures object'(): void {
    const obj = {
      pictures: null,
    }
    expect(isData(obj)).to.equal(false)
  }

  @test
  'it should reject undefiend object'(): void {
    const obj = {
      pictures: undefined,
    }
    expect(isData(obj)).to.equal(false)
  }

  @test
  'it should reject non array pictures object'(): void {
    const obj = {
      pictures: '[]',
    }
    expect(isData(obj)).to.equal(false)
  }

  @test
  'it should reject invalid pictures array object'(): void {
    const obj = {
      pictures: [0],
    }
    expect(isData(obj)).to.equal(false)
  }

  @test
  'it should accept bare object'(): void {
    const obj = {}
    expect(isData(obj)).to.equal(true)
  }

  @test
  'it should accept enpty children array object'(): void {
    const obj = {
      children: [],
    }
    expect(isData(obj)).to.equal(true)
  }

  @test
  'it should accept empty pictures array object'(): void {
    const obj = {
      pictures: [],
    }
    expect(isData(obj)).to.equal(true)
  }

  @test
  'it should accept valid children array object'(): void {
    const obj = {
      children: [
        {
          name: '',
          path: '',
          cover: null,
          totalSeen: 0,
          totalCount: 100,
        },
      ],
    }
    expect(isData(obj)).to.equal(true)
  }

  @test
  'it should accept valid pictures array object'(): void {
    const obj = {
      pictures: [
        {
          name: '',
          path: '',
          seen: false,
        },
      ],
    }
    expect(isData(obj)).to.equal(true)
  }
}

abstract class BaseFolderTests extends PubSub {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  document: Document
  dom: JSDOM

  constructor() {
    super()
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.document = global.document
    this.dom = new JSDOM('', {})
  }

  before(): void {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    this.document = this.dom.window.document
    this.existingWindow = global.window
    global.window = Cast<Window & typeof globalThis>(this.dom.window)
    this.existingDocument = global.document
    global.document = this.dom.window.document

    PubSub.subscribers = {}
    PubSub.deferred = []
    Folders.FolderCard = null
  }

  after(): void {
    global.window = this.existingWindow
    global.document = this.existingDocument
  }
}

@suite
export class FoldersInitTests extends BaseFolderTests {
  BuildFoldersSpy: sinon.SinonStub = sinon.stub()

  before(): void {
    super.before()
    this.BuildFoldersSpy = sinon.stub(Folders, 'BuildFolders')
  }

  after(): void {
    this.BuildFoldersSpy.restore()
    super.after()
  }

  @test
  'it should subscribe to Navigate:Data'(): void {
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.equal(undefined)
    Folders.Init()
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.have.length(1)
  }

  @test
  'it should build folders on Navigate:Data'(): void {
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.equal(undefined)
    Folders.Init()
    const subscriberfn = PubSub.subscribers['NAVIGATE:DATA']?.pop()
    assert(subscriberfn !== undefined)
    expect(this.BuildFoldersSpy.called).to.equal(false)
    const data = {
      children: [],
      nonce: Math.random(),
    }
    subscriberfn(data)
    expect(this.BuildFoldersSpy.calledWith(data)).to.equal(true)
  }

  @test
  'it should locate and save the folder card for use when building markup'(): void {
    expect(Folders.FolderCard).to.equal(null)
    Folders.Init()
    expect(Folders.FolderCard).to.not.equal(null)
  }

  @test
  'it should set null for missing folder card for use when building markup'(): void {
    this.document.querySelector('#FolderCard')?.remove()
    expect(Folders.FolderCard).to.equal(null)
    Folders.Init()
    expect(Folders.FolderCard).to.equal(null)
  }
}

@suite
export class FoldersBuildFoldersTests extends BaseFolderTests {
  BuildCardSpy: sinon.SinonStub = sinon.stub()
  TabSelectSpy: sinon.SinonStub = sinon.stub()
  TestFolder: Folder = {
    name: 'foo',
    path: '/path/foo',
    cover: '/path/foo/cover.png',
    totalCount: 100,
    totalSeen: 0,
  }

  before(): void {
    super.before()
    this.BuildCardSpy = sinon.stub(Folders, 'BuildCard')
    this.BuildCardSpy.returns(this.document.createElement('div'))
    this.TabSelectSpy = sinon.stub()
    PubSub.subscribers['TAB:SELECT'] = [this.TabSelectSpy]
  }

  after(): void {
    this.BuildCardSpy.restore()
    super.after()
  }

  @test
  'it should remove folder elements from tab'(): void {
    const tab = this.document.querySelector('div#tabFolders')
    assert(tab !== null, 'Tab cannot be null for valid test')
    for (let i = 0; i < 10; i++) {
      const elem = this.document.createElement('div')
      elem.classList.add('folders')
      tab.appendChild(elem)
    }
    expect(tab.children).to.have.length(10)
    Folders.BuildFolders({})
    expect(tab.children).to.have.length(0)
  }

  @test
  'it should leave non-folder elements in tab'(): void {
    const tab = this.document.querySelector('div#tabFolders')
    assert(tab !== null, 'Tab cannot be null for valid test')
    for (let i = 0; i < 10; i++) {
      const elem = this.document.createElement('div')
      elem.classList.add('not-a-folders')
      tab.appendChild(elem)
    }
    expect(tab.children).to.have.length(10)
    Folders.BuildFolders({})
    expect(tab.children).to.have.length(10)
  }

  @test
  'it should hide tab link for missing children list'(): void {
    const link = this.document.querySelector('div#tabLink')
    assert(link !== null, 'Link must exist for valid test')
    expect(link.classList.contains('hidden')).to.equal(false)
    Folders.BuildFolders({
      children: undefined,
      pictures: [
        {
          name: '',
          path: '',
          seen: false,
        },
      ],
    })
    expect(link.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should hide tab link for empty children list'(): void {
    const link = this.document.querySelector('div#tabLink')
    assert(link !== null, 'Link must exist for valid test')
    expect(link.classList.contains('hidden')).to.equal(false)
    Folders.BuildFolders({
      children: [],
      pictures: [
        {
          name: '',
          path: '',
          seen: false,
        },
      ],
    })
    expect(link.classList.contains('hidden')).to.equal(true)
  }

  @test
  'it should reveal tab link for children list with elements'(): void {
    const link = this.document.querySelector('div#tabLink')
    assert(link !== null, 'Link must exist for valid test')
    link.classList.add('hidden')
    Folders.BuildFolders({
      children: [this.TestFolder],
    })
    expect(link.classList.contains('hidden')).to.equal(false)
  }

  @test
  'it should select Folders tab when Pictures are missing'(): void {
    expect(this.TabSelectSpy.called).to.equal(false)
    Folders.BuildFolders({
      children: [this.TestFolder],
      pictures: undefined,
    })
    expect(this.TabSelectSpy.calledWith('Folders')).to.equal(true)
  }

  @test
  'it should select Folders tab when Pictures are empty'(): void {
    expect(this.TabSelectSpy.called).to.equal(false)
    Folders.BuildFolders({
      children: [this.TestFolder],
      pictures: [],
    })
    expect(this.TabSelectSpy.calledWith('Folders')).to.equal(true)
  }

  @test
  'it should not select Folders tab when folders are missing and Pictures are missing'(): void {
    expect(this.TabSelectSpy.called).to.equal(false)
    Folders.BuildFolders({
      children: undefined,
      pictures: undefined,
    })
    expect(this.TabSelectSpy.calledWith('Folders')).to.equal(false)
  }

  @test
  'it should select Folders tab when folders are empty and Pictures are empty'(): void {
    expect(this.TabSelectSpy.called).to.equal(false)
    Folders.BuildFolders({
      children: [],
      pictures: undefined,
    })
    expect(this.TabSelectSpy.calledWith('Folders')).to.equal(false)
  }

  @test
  'it should not select Folders tab when Pictures are present'(): void {
    expect(this.TabSelectSpy.called).to.equal(false)
    Folders.BuildFolders({
      children: [this.TestFolder],
      pictures: [
        {
          path: '',
          name: '',
          seen: false,
        },
      ],
    })
    expect(this.TabSelectSpy.calledWith('Folders')).to.equal(false)
  }

  @test
  'it should append folders div to tab contents'(): void {
    const tab = this.document.querySelector('div#tabFolders')
    assert(tab !== null, 'Tab cannot be null for valid test')
    expect(tab.children).to.have.length(0)
    Folders.BuildFolders({
      children: [this.TestFolder],
    })
    expect(tab.children).to.have.length(1)
    expect(tab.firstElementChild?.classList.contains('folders')).to.equal(true)
  }

  @test
  'it should call BuildCard to build cards'(): void {
    Folders.BuildFolders({
      children: Array(50).fill(this.TestFolder),
    })
    expect(this.BuildCardSpy.callCount).to.equal(50)
  }

  @test
  'it should use results of BuildCard to fill folder container'(): void {
    this.BuildCardSpy.callsFake(() => this.document.createElement('div'))
    Folders.BuildFolders({
      children: Array(50).fill(this.TestFolder),
    })
    const container = this.document.querySelector('div#tabFolders .folders')
    assert(container !== null, 'Tab cannot be null for valid test')
    expect(container.children).to.have.length(50)
  }

  @test
  'it should not append anything when BuildCard returns null'(): void {
    this.BuildCardSpy.returns(null)
    Folders.BuildFolders({
      children: [this.TestFolder],
    })
    const container = this.document.querySelector('div#tabFolders .folders')
    assert(container !== null, 'Tab cannot be null for valid test')
    expect(container.children).to.have.length(0)
  }
}

@suite
export class FoldersBuildCardTests extends BaseFolderTests {
  FolderCard: DocumentFragment | null = null

  before(): void {
    super.before()
    const template = document.querySelector<HTMLTemplateElement>('#FolderCard')
    assert(template !== null)
    this.FolderCard = template.content
    Folders.FolderCard = this.FolderCard
  }

  @test
  'it should return null when template is missing'(): void {
    Folders.FolderCard = null
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 0,
    })
    expect(result).to.equal(null)
  }

  @test
  'it should return null when template is empty'(): void {
    for (const child of this.FolderCard?.children ?? []) {
      child.remove()
    }
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 0,
    })
    expect(result).to.equal(null)
  }

  @test
  'it should leave emoji cover when cover image is null'(): void {
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: null,
      totalCount: 100,
      totalSeen: 0,
    })
    const icon = result?.querySelector('i.material-icons') ?? null
    expect(icon).to.not.equal(null)
    expect(icon?.innerHTML).to.equal('folder')
  }

  @test
  'it should leave emoji cover when cover image is empty'(): void {
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '',
      totalCount: 100,
      totalSeen: 0,
    })
    const icon = result?.querySelector('i.material-icons') ?? null
    expect(icon).to.not.equal(null)
    expect(icon?.innerHTML).to.equal('folder')
  }

  @test
  'it should remove emoji cover when cover image is set'(): void {
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 0,
    })
    const icon = result?.querySelector('i.material-icons') ?? null
    expect(icon).to.equal(null)
  }

  @test
  'it should set card backgroundImage when cover image is set'(): void {
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 0,
    })
    expect(result?.style.backgroundImage).to.equal('url(/images/preview/path/foo/cover.png-image.webp)')
  }

  @test
  'it should not set seen flag when read count iz zero'(): void {
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 0,
    })
    expect(result?.classList.contains('seen')).to.equal(false)
  }

  @test
  'it should not set seen flag when read count less than total count'(): void {
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 50,
    })
    expect(result?.classList.contains('seen')).to.equal(false)
  }

  @test
  'it should set seen flag when read count equals total count'(): void {
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 100,
    })
    expect(result?.classList.contains('seen')).to.equal(true)
  }

  @test
  'it should set seen flag when read count exceeds total count'(): void {
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 101,
    })
    expect(result?.classList.contains('seen')).to.equal(true)
  }

  @test
  'it should set folder name header'(): void {
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 101,
    })
    expect(result?.querySelector('h5')?.innerText).to.equal('foo')
  }

  @test
  'it should gracefully decline to set folder name header when missing'(): void {
    this.FolderCard?.querySelector('h5')?.remove()
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 10,
    })
    expect(result?.querySelector('h5')).to.equal(null)
  }

  @test
  'it should set folder progress text'(): void {
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 42,
    })
    expect(result?.querySelector<HTMLDivElement>('div.text')?.innerText).to.equal('42/100')
  }

  @test
  'it should gracefully decline to set folder progress text when missing'(): void {
    this.FolderCard?.querySelector('div.text')?.remove()
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 101,
    })
    expect(result?.querySelector('div.text')).to.equal(null)
  }

  @test
  'it should set folder slider width'(): void {
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 10000,
      totalSeen: 666,
    })
    expect(result?.querySelector<HTMLDivElement>('div.slider')?.style.width).to.equal('6.66%')
  }

  @test
  'it should gracefully decline to set folder slider width when missing'(): void {
    this.FolderCard?.querySelector('div.slider')?.remove()
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 101,
    })
    expect(result?.querySelector('div.slider')).to.equal(null)
  }

  @test
  'it should navigate on click'(): void {
    const evt = new this.dom.window.MouseEvent('click')
    const result = Folders.BuildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      totalSeen: 101,
    })
    const spy = sinon.stub()
    PubSub.subscribers['NAVIGATE:LOAD'] = [spy]
    assert(result !== null, 'result is required for valid test')
    result.dispatchEvent(evt)
    expect(spy.calledWith('/path/foo')).to.equal(true)
  }
}
