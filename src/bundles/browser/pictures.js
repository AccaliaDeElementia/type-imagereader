'use sanity'

const pubsub = require('./pubsub')
const net = require('./net')
const loading = require('./loading')

let images = null
let currentImage = null
let index = null

const mainImage = document.querySelector('#bigImage img')
mainImage.addEventListener('load', () => {
  pubsub.publish('loading.hide')
})
mainImage.addEventListener('error', () => {
  pubsub.publish('error', `Main Image Failed to Load: ${currentImage.path}`)
})

const loadImage = () => {
  pubsub.publish('loading.show')
  currentImage.element.classList.add('seen')
  mainImage.src = `/images/full${currentImage.path}`
  net.postJSON('/api/navigate/latest', { path: currentImage.path })
  const displayTotal = images.length.toLocaleString()
  const displayIndex = (index + 1).toLocaleString()
  const displayPercent = (Math.floor(1000 * (index + 1) / images.length) / 10).toLocaleString()
  document.querySelector('.statusBar.bottom .center').innerText = currentImage.name
  document.querySelector('.statusBar.bottom .left').innerText = `(${displayIndex}/${displayTotal})`
  document.querySelector('.statusBar.bottom .right').innerText = `(${displayPercent}%)`
}

const doPages = data => {
  const pageSize = 32
  const pageCount = Math.ceil(data.pictures.length / pageSize)
  let currentPage = 0

  const pages = {}
  const pageLinks = {}
  const selectPage = index => {
    currentPage = index
    for (const element of domItems.childNodes) {
      element.classList.remove('active')
    }
    pageLinks[currentPage].classList.add('active')
    for (const element of document.querySelectorAll('#tabImages .page')) {
      element.classList.add('hidden')
    }
    pages[currentPage].classList.remove('hidden')
  }

  const tab = document.querySelector('#tabImages')

  const paginator = document.querySelector('#Paginator').content.cloneNode(true).firstChild
  const domItems = paginator.querySelector('.pagination')
  const pageItem = document.querySelector('#PaginatorItem')
  tab.appendChild(paginator)
  const makeItem = (label, i, getIndex) => {
    const item = pageItem.content.cloneNode(true).firstChild
    item.querySelector('span').innerText = label
    item.addEventListener('click', evt => {
      evt.preventDefault()
      selectPage(getIndex())
    })
    pageLinks[i] = item
    domItems.appendChild(item)
  }

  const makePage = (i, pictures) => {
    const page = document.createElement('div')
    page.classList.add('page')

    const imageCard = document.querySelector('#ImageCard')
    for (const image of pictures) {
      const card = imageCard.content.cloneNode(true).firstChild
      card.style.backgroundImage = `url("/images/preview${image.path}")`
      if (image.seen) {
        card.classList.add('seen')
      }
      card.querySelector('h5').innerText = image.name
      card.addEventListener('click', () => {
        currentImage = image
        loadImage()
        pubsub.publish('menu.hide')
        selectPage(i)
      })
      page.appendChild(card)
      image.element = card
      image.page = i
    }
    pages[i] = page
    tab.appendChild(page)
  }
  makeItem('«', '«', () => Math.max(currentPage - 1, 0))
  Array.from({ length: pageCount }).forEach((_, i) => {
    makeItem(i + 1, i, () => i)
    const pictures = data.pictures.slice(i * pageSize, (i + 1) * pageSize)
    makePage(i, pictures)
  })
  makeItem('»', '»', () => Math.min(currentPage + 1, pageCount - 1))
  selectPage(currentImage.page)
}

const doImages = data => {
  for (const existing of document.querySelectorAll('#tabImages .pages, #tabImages .page')) {
    existing.parentElement.removeChild(existing)
  }

  document.querySelector('.statusBar.bottom .center').innerText = ''
  document.querySelector('.statusBar.bottom .left').innerText = ''
  document.querySelector('.statusBar.bottom .right').innerText = ''
  mainImage.setAttribute('src', '')

  images = null
  currentImage = null
  index = null

  mainImage.classList.remove('hidden')

  if (!data.pictures || !data.pictures.length) {
    mainImage.classList.add('hidden')
    pubsub.publish('menu.show')
    document.querySelector('a[href="#tabImages"]').parentElement.classList.add('hidden')
    return
  }
  document.querySelector('a[href="#tabImages"]').parentElement.classList.remove('hidden')

  index = 0
  images = data.pictures
  currentImage = images[index]
  for (const image of images) {
    if (image.path === data.cover) {
      index = image.index
      currentImage = image
    }
  }

  pubsub.publish('selectTab', '#tabImages')

  doPages(data)

  if (images.every(img => img.seen)) {
    pubsub.publish('menu.show')
  } else {
    pubsub.publish('menu.hide')
  }

  if (currentImage) {
    loadImage()
  }
}
pubsub.subscribe('navigate.data', doImages)

const selectUnseenIndex = selector => {
  const candidates = ([
    images.filter(image => !image.seen && image.index > index),
    images.filter(image => !image.seen && image.index < index)
  ]).flat()
  if (candidates.length < 1) {
    return -1
  }
  return selector(candidates).index
}

const changeImage = (predicate, newIndex) => {
  if (loading.isLoading()) {
    return
  }
  if (predicate) {
    if (newIndex >= 0 && newIndex < images.length) {
      index = newIndex
      currentImage = images[newIndex]
      loadImage()
      pubsub.publish('menu.hide')
    } else {
      pubsub.publish('error', 'Invalid Image Change Event')
    }
  } else {
    pubsub.publish('error', 'Image Change Predicate Failed')
  }
}

pubsub.subscribe('action.execute', 'Previous', () => {
  const actualEvent = window.localStorage.ShowUnseenOnly === 'true' ? 'PreviousUnseen' : 'PreviousImage'
  pubsub.publish('action.execute', actualEvent)
})
pubsub.subscribe('action.execute', 'PreviousImage', () => changeImage(index >= 0, index - 1))
pubsub.subscribe('action.execute', 'PreviousUnseen', () => {
  const idx = selectUnseenIndex(l => l.pop())
  changeImage(idx >= 0, idx)
})
pubsub.subscribe('action.execute', 'Next', () => {
  const actualEvent = window.localStorage.ShowUnseenOnly === 'true' ? 'NextUnseen' : 'NextImage'
  pubsub.publish('action.execute', actualEvent)
})
pubsub.subscribe('action.execute', 'NextImage', () =>
  changeImage(index < images.length - 1, index + 1))
pubsub.subscribe('action.execute', 'NextUnseen', () => {
  const idx = selectUnseenIndex(l => l.shift())
  changeImage(idx >= 0, idx)
})
pubsub.subscribe('action.execute', 'ViewFullSize', () =>
  window.open(`/images/full${currentImage.path}`))
pubsub.subscribe('action.execute', 'Bookmark', () =>
  net.postJSON('/api/bookmarks/add', { path: currentImage.path }).then(() =>
    pubsub.publish('bookmarks.load')
  ))
const updateSlider = () => {
  const showAll = window.localStorage.ShowUnseenOnly !== 'true'
  const element = document.querySelector('.selectUnreadAll > div')
  if (showAll) {
    element.classList.remove('unread')
    element.classList.add('all')
  } else {
    element.classList.add('unread')
    element.classList.remove('all')
  }
}
updateSlider()
document.querySelector('.selectUnreadAll').addEventListener('click', evt => {
  window.localStorage.ShowUnseenOnly = !(window.localStorage.ShowUnseenOnly === 'true')
  updateSlider()
  evt.preventDefault()
})

const menu = document.querySelector('#mainMenu')
const doIfNoMenu = action => {
  return () => {
    if (menu.classList.contains('hidden')) {
      pubsub.publish('action.execute', action)
    } else {
      pubsub.publish('action.execute', 'HideMenu')
    }
  }
}
pubsub.subscribe('action.keypress', 'ArrowUp', doIfNoMenu('ShowMenu'))
pubsub.subscribe('action.keypress', 'ArrowRight', doIfNoMenu('Next'))
pubsub.subscribe('action.keypress', 'ArrowLeft', doIfNoMenu('Previous'))
pubsub.subscribe('action.keypress', 'ArrowDown', doIfNoMenu('ShowMenu'))

const initialScale = window.visualViewport ? window.visualViewport.scale : 1
document.querySelector('#bigImage').addEventListener('click', evt => {
  if (window.visualViewport && window.visualViewport.scale > initialScale) {
    return
  }
  const pageWidth = window.innerWidth || document.body.clientWidth
  const x = evt.pageX
  if (x < pageWidth / 3) {
    pubsub.publish('action.keypress', 'ArrowLeft')
  } else if (x < pageWidth * 2 / 3) {
    pubsub.publish('action.keypress', 'ArrowUp')
  } else {
    pubsub.publish('action.keypress', 'ArrowRight')
  }
})
