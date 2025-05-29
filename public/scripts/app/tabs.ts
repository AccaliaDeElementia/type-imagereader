'use sanity'

import { Subscribe, Publish } from './pubsub'

export const Tabs = {
  tabs: ((): HTMLElement[] => [])(),
  tabNames: ((): string[] => [])(),
  Init: (): void => {
    Tabs.tabs = Array.from(document.querySelectorAll<HTMLElement>('.tab-list a'))
    Tabs.tabNames = Tabs.tabs.map((tab) => tab.getAttribute('href')).filter((name) => name !== null)

    for (const tab of Tabs.tabs) {
      tab.parentElement?.addEventListener('click', (evt) => {
        Tabs.SelectTab(tab.getAttribute('href') ?? '')
        evt.preventDefault()
        return false
      })
    }

    Subscribe('Tab:Select', async (name) => {
      if (typeof name === 'string') Tabs.SelectTab(name)
      await Promise.resolve()
    })
    Tabs.SelectTab()
  },
  SelectTab: (href?: string): void => {
    if (href != null && !href.startsWith('#')) {
      href = `#tab${href}`
    }
    const lowerHref = href?.toLowerCase()
    if (href == null || !Tabs.tabNames.some((name) => name.toLowerCase() === lowerHref)) {
      href = Tabs.tabNames[0] ?? ''
    }
    for (const tab of Tabs.tabs) {
      tab.parentElement?.classList.remove('active')
      href = setTabActive(tab, lowerHref) ?? href
    }
    Publish('Tab:Selected', href)
  },
}

function setTabActive(tab: HTMLElement, activeHref: string | undefined): string | null {
  const tabHref = tab.getAttribute('href')
  let href = null
  if (tabHref == null) return null
  const content = document.querySelector<HTMLElement>(tabHref)
  if (tabHref.toLowerCase() === activeHref) {
    href = tabHref
    tab.parentElement?.classList.add('active')
    content?.style.setProperty('display', 'block')
    content?.scroll({
      top: 0,
      behavior: 'smooth',
    })
  } else {
    content?.style.setProperty('display', 'none')
  }
  return href
}
