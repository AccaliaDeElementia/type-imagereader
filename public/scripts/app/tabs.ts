'use sanity'

import { subscribe as _subscribe, publish as _publish } from './pubsub.js'

export const Imports = {
  subscribe: _subscribe,
  publish: _publish,
}

const DEFAULT_TAB = 0
const SCROLL_TOP = 0

export const Tabs = {
  tabs: [] as HTMLElement[],
  tabNames: [] as string[],
}

export function init(): void {
  Tabs.tabs = Array.from(document.querySelectorAll<HTMLElement>('.tab-list a'))
  Tabs.tabNames = Tabs.tabs.map((tab) => tab.getAttribute('href')).filter((name) => name !== null)

  for (const tab of Tabs.tabs) {
    tab.parentElement?.addEventListener('click', (evt) => {
      Internals.selectTab(tab.getAttribute('href') ?? '')
      evt.preventDefault()
    })
  }

  Imports.subscribe('Tab:Select', async (name) => {
    if (typeof name === 'string') Internals.selectTab(name)
    await Promise.resolve()
  })
  Internals.selectTab()
}

function selectTab(href?: string): void {
  let target = href
  if (href !== undefined && !href.startsWith('#')) {
    target = `#tab${href}`
  }
  const lowerHref = target?.toLowerCase()
  if (target === undefined || !Tabs.tabNames.some((name) => name.toLowerCase() === lowerHref)) {
    target = Tabs.tabNames[DEFAULT_TAB] ?? ''
  }
  for (const tab of Tabs.tabs) {
    tab.parentElement?.classList.remove('active')
    target = setTabActive(tab, lowerHref) ?? target
  }
  Imports.publish('Tab:Selected', target)
}

function setTabActive(tab: HTMLElement, activeHref: string | undefined): string | null {
  const tabHref = tab.getAttribute('href')
  let href = null
  if (tabHref === null) return null
  const content = document.querySelector<HTMLElement>(tabHref)
  if (tabHref.toLowerCase() === activeHref) {
    href = tabHref
    tab.parentElement?.classList.add('active')
    content?.style.setProperty('display', 'block')
    content?.scroll({
      top: SCROLL_TOP,
      behavior: 'smooth',
    })
  } else {
    content?.style.setProperty('display', 'none')
  }
  return href
}

export const Internals = {
  selectTab,
}
