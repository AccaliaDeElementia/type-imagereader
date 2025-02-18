'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import TimeUpdater from '../../../public/scripts/slideshow/time'
import { ForceCastTo } from '../../testutils/TypeGuards'

const markup = `
html
  body
    div.text.datetime
    div.time
    div.date
`

@suite
export class SlideshowTimeTests {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  dom: JSDOM
  clock: sinon.SinonFakeTimers | undefined
  constructor() {
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.dom = new JSDOM('')
  }

  before(): void {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    this.existingWindow = global.window
    global.window = ForceCastTo<Window & typeof globalThis>(this.dom.window)
    this.existingDocument = global.document
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => this.dom.window.document,
    })
  }

  after(): void {
    global.window = this.existingWindow
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => this.existingDocument,
    })

    this.clock?.restore()
    this.clock = undefined
  }

  @test
  'updateTime fires every 0.1 seconds'(): void {
    expect(TimeUpdater.period).to.equal(100)
  }

  @test
  async 'updateTime sets time field in 24 hour format'(): Promise<void> {
    const now = new Date('1969-07-20T20:17:00.000Z')
    const time = this.dom.window.document.querySelector('.time')
    const matrix: Array<[number, number, string]> = [
      [1, 5, '01:05'],
      [1, 32, '01:32'],
      [11, 5, '11:05'],
      [13, 5, '13:05'],
      [23, 49, '23:49'],
    ]
    for (const [hour, minute, expected] of matrix) {
      now.setHours(hour)
      now.setMinutes(minute)
      this.clock = sinon.useFakeTimers({
        now: now.getTime(),
        shouldClearNativeTimers: false,
      })
      await TimeUpdater.updateFn()
      this.clock.restore()
      expect(time?.innerHTML).to.equal(expected)
    }
  }

  @test
  async 'updateTime sets date field'(): Promise<void> {
    const now = new Date('1969-07-20T20:17:00.000Z')
    const dateElem = this.dom.window.document.querySelector('.date')
    const matrix: Array<[number, number, string]> = [
      [0, 1, 'Wednesday, January 1'],
      [1, 2, 'Sunday, February 2'],
      [2, 3, 'Monday, March 3'],
      [3, 4, 'Friday, April 4'],
      [4, 5, 'Monday, May 5'],
      [5, 6, 'Friday, June 6'],
      [6, 7, 'Monday, July 7'],
      [7, 8, 'Friday, August 8'],
      [8, 9, 'Tuesday, September 9'],
      [9, 9, 'Thursday, October 9'],
      [10, 11, 'Tuesday, November 11'],
      [11, 13, 'Saturday, December 13'],
    ]
    for (const [month, date, expected] of matrix) {
      now.setMonth(month)
      now.setDate(date)
      this.clock = sinon.useFakeTimers({
        now: now.getTime(),
        shouldClearNativeTimers: false,
      })
      await TimeUpdater.updateFn()
      this.clock.restore()
      expect(dateElem?.innerHTML).to.equal(expected)
    }
  }
}
