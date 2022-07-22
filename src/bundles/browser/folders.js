'use sanity'

const pubsub = require('./pubsub')
const actions = require('./actions')

const doActions = () => {
  const buttons = [
    {
      name: 'Previous Folder',
      image: 'first_page'
    }, {
      name: 'Mark All Seen',
      image: 'check_box'
    }, {
      name: 'Fullscreen',
      image: 'fullscreen'
    }, {
      name: 'Parent Folder',
      image: 'folder'
    }, {
      name: 'Slideshow',
      image: 'slideshow'
    }, {
      name: 'Mark All Unseen',
      image: 'check_box_outline_blank'
    }, {
      name: 'Next Folder',
      image: 'last_page'
    }
  ]
  const existing = document.querySelector('#tabFolders .actions')
  if (existing) {
    existing.parentElement.removeChild(existing)
  }
  const container = actions.createButtons(buttons)
  document.querySelector('#tabFolders').appendChild(container)
}

const doFolders = data => {
  const existing = document.querySelector('#tabFolders .folders')
  if (existing) {
    existing.parentElement.removeChild(existing)
  }
  if (!data.children || !data.children.length) {
    document.querySelector('a[href="#tabFolders"]').parentElement.classList.add('hidden')
    return
  }
  if (!data.pictures || !data.pictures.length) {
    pubsub.publish('selectTab', '#tabFolders')
  }
  document.querySelector('a[href="#tabFolders"]').parentElement.classList.remove('hidden')
  const container = document.createElement('div')
  container.classList.add('folders')
  document.querySelector('#tabFolders').appendChild(container)

  const folderCard = document.querySelector('#FolderCard')

  for (const folder of data.children) {
    const card = folderCard.content.cloneNode(true).firstChild
    if (folder.cover) {
      const icon = card.querySelector('i')
      icon.parentElement.removeChild(icon)
      card.style.backgroundImage = `url("/images/preview${folder.cover}")`
    }
    if (folder.totalSeen >= folder.totalCount) {
      card.classList.add('seen')
    }
    const seenCount = folder.totalSeen.toLocaleString()
    const totalCount = folder.totalCount.toLocaleString()
    const percentSeen = folder.totalSeen / folder.totalCount * 100
    card.querySelector('h5').innerText = folder.name
    card.querySelector('.text').innerText = `${seenCount}/${totalCount}`
    card.querySelector('.slider').style.width = `${percentSeen}%`
    card.attributes['data-path'] = folder.path
    card.addEventListener('click', () =>
      pubsub.publish('navigate.load', folder.path))
    container.appendChild(card)
  }
}

doActions()
pubsub.subscribe('navigate.data', doFolders)
