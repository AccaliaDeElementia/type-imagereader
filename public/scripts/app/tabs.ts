'use sanity'

import { Subscribe, Publish } from './pubsub'

const tabs: Element[] = Array.from(document.querySelectorAll('.tab-list a'))
const tabNames: string[] = tabs.map(tab => tab.getAttribute('href'))
  .filter(name => name !== null) as string[]

const selectTab = (href?: string): void => {
  if (href && href[0] !== '#') {
    href = `#tab${href}`
  }
  if (!href || !tabNames.some(name => name === href)) {
    href = tabNames[0] || ''
  }
  const lowerHref = href.toLowerCase()
  for (const tab of tabs) {
    let tabHref = tab.getAttribute('href')
    if (tabHref === null) continue
    const content: HTMLElement = document.querySelector(tabHref) as HTMLElement
    if (!content) continue
    tabHref = tabHref.toLowerCase()
    if (tabHref === lowerHref) {
      tab.parentElement?.classList.add('active')
      content.style.display = 'block'
      content.scroll({
        top: 0,
        behavior: 'smooth'
      })
    } else {
      tab.parentElement?.classList.remove('active')
      content.style.display = 'none'
    }
  }
  Publish('Tab:Selected', href)
}

for (const tab of tabs) {
  tab.parentElement?.addEventListener('click', evt => {
    selectTab(tab.getAttribute('href') || '')
    evt.preventDefault()
    return false
  })
}

Subscribe('Tab:Select', selectTab)
selectTab()
