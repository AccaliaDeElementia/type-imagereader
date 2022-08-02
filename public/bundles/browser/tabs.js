'use sanity'

const pubsub = require('./pubsub')

const tabs = Array.from(document.querySelectorAll('.tab-list a'))
const tabNames = tabs.map(tab => tab.attributes.href.value)
const select = href => {
  if (href && href[0] !== '#') {
    href = `#${href}`
  }
  if (!tabNames.some(name => name === href)) {
    href = tabNames[0]
  }
  href = href.toLowerCase()
  for (const tab of tabs) {
    const content = document.querySelector(tab.attributes.href.value)
    const linkHref = tab.attributes.href.value.toLowerCase()
    if (linkHref === href) {
      tab.parentElement.classList.add('active')
      content.style.display = 'block'
      content.scroll({
        top: 0,
        behavior: 'smooth'
      })
    } else {
      tab.parentElement.classList.remove('active')
      content.style.display = 'none'
    }
  }
  pubsub.publish('tabSelect', href)
}
for (const tab of tabs) {
  tab.parentElement.addEventListener('click', evt => {
    select(tab.attributes.href.value)
    evt.preventDefault()
    return false
  })
}
pubsub.subscribe('selectTab', select)
select('')
