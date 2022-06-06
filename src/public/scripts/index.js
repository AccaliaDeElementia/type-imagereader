/* global picturereaderdata:writeable, fetch */

(() => {
  const selectElement = (selector, root = document) => root.querySelector(selector)
  const selectElements = (selector, root = document) => Array.prototype.slice.apply(
    root.querySelectorAll(selector)
  )

  const postJSON = (uri, data) => fetch(
    uri,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(data)
    })

  const navBar = selectElement('nav.navbar')
  let errorCount = 0
  const showError = () => {
    errorCount++
    const expected = errorCount
    selectElement('#loadingScreen').style.display = 'none'
    navBar.classList.add('error')
    setTimeout(() => {
      if (errorCount === expected) {
        navBar.classList.remove('error')
      }
    }, 1000)
  }

  const ImageNavigation = (() => {
    const updateSlider = () => {
      const showAll = window.localStorage.ShowUnseenOnly !== 'true'
      const element = selectElement('.selectUnreadAll > div')
      if (showAll) {
        element.classList.remove('unread')
        element.classList.add('all')
      } else {
        element.classList.add('unread')
        element.classList.remove('all')
      }
    }
    updateSlider()
    selectElement('.selectUnreadAll').addEventListener('click', evt => {
      ImageNavigation.Toggle()
      evt.preventDefault()
    })
    return {
      ShowAll: () => {
        window.localStorage.ShowUnseenOnly = 'false'
        updateSlider()
      },
      ShowUnseen: () => {
        window.localStorage.ShowUnseenOnly = 'true'
        updateSlider()
      },
      Toggle: () => {
        if (ImageNavigation.IsShowAll()) {
          ImageNavigation.ShowUnseen()
        } else {
          ImageNavigation.ShowAll()
        }
      },
      IsShowUnseen: () => window.localStorage.ShowUnseenOnly === 'true',
      IsShowAll: () => window.localStorage.ShowUnseenOnly !== 'true'

    }
  })()

  const Tabs = (() => {
    const tabs = selectElements('.nav-tabs .nav-link')
    const selectTab = href => {
      for (const tab of tabs) {
        const tabContent = selectElement(tab.attributes.href.value)
        if (tab.attributes.href.value === href) {
          tab.parentElement.classList.add('active')
          tabContent.style.display = 'block'
        } else {
          tab.parentElement.classList.remove('active')
          tabContent.style.display = 'none'
        }
      }
    }
    for (const tab of tabs) {
      tab.addEventListener('click', evt => {
        selectTab(tab.attributes.href.value)
        evt.preventDefault()
        return false
      })
    }
    return {
      select: tab => selectTab(tab)
    }
  })()

  const Pages = (() => {
    const container = selectElement('#pictures .paginated')
    const pages = selectElements('.page', container)
    const pageItems = selectElements('.page-item', container)
    const activatePage = (page = null) => {
      if (page === null) {
        page = +selectElement('.card.picture.active').parentElement.attributes['data-page'].value
      }
      for (const item of pageItems) {
        if (+item.attributes['data-page'].value === page) {
          item.classList.add('active')
        } else {
          item.classList.remove('active')
        }
      }
      for (const item of pages) {
        if (+item.attributes['data-page'].value === page) {
          item.classList.add('active')
          item.style.display = null
          const images = selectElements('img', item)
          for (const image of images) {
            if (image.attributes['data-src'].value) {
              image.src = image.attributes['data-src'].value
            }
          }
        } else {
          item.classList.remove('active')
          item.style.display = 'none'
        }
      }
    }
    for (const item of pageItems) {
      item.addEventListener('click', evt => {
        const pageData = evt.currentTarget.attributes['data-page'].value
        const currentPage = +selectElement('.card.picture.active').parentElement.attributes['data-page'].value
        let page = +pageData
        if (pageData === 'prev') {
          page = currentPage - 1
        } else if (pageData === 'next') {
          page = currentPage + 1
        }
        if (page >= 1 && page <= pages.length) {
          activatePage(page)
        }
      })
    }
    return {
      updateActive: activatePage
    }
  })()

  const Bookmarks = (() => {
    for (const remover of selectElements('.bookmark .btn.remove')) {
      remover.addEventListener('click', () => {
        const path = remover.attributes['data-path'].value
        postJSON('/api/bookmarks/remove', { path }).then(() => window.location.reload())
        return false
      })
    }

    for (const bookmark of selectElements('.bookmark')) {
      bookmark.addEventListener('click', () => {
        const path = bookmark.attributes['data-path'].value
        const folder = bookmark.attributes['data-folder'].value
        postJSON('/api/navigate/latest', { path }).then(() => window.location.assign(`/show${folder}?noMenu`))
        return false
      })
    }
    return {
      add: () => {
        const path = selectElement('#mainImage img').attributes['data-path'].value
        postJSON('/api/bookmarks/add', { path }).then(() => window.location.reload())
      }
    }
  })()

  const Images = (() => {
    const mainImage = selectElement('#mainImage img')
    const loadingScreen = selectElement('#loadingScreen')
    let pics = picturereaderdata.pictures.pages.flat()
    let index = 0
    selectElements('.card.picture').forEach((elem, i) => {
      pics[i].element = elem
    })
    for (const pic of pics) {
      if (pic.path === picturereaderdata.cover) {
        index = pic.index
      }
    }

    const reloadData = () => fetch(`/api/listing${picturereaderdata.path}`)
      .then(response => response.json())
      .then(data => {
        picturereaderdata = data
        pics = picturereaderdata.pictures.pages.flat()
        selectElements('.card.picture').forEach((elem, i) => {
          pics[i].element = elem
          if (pics[i].seen) {
            pics[i].element.classList.add('seen')
          } else {
            pics[i].element.classList.remove('seen')
          }
        })
      })

    const loadImage = pic => {
      if (!pic) return
      for (const activePic of selectElements('.card.picture.active')) {
        activePic.classList.remove('active')
      }
      pic.element.classList.add('active')
      pic.element.classList.add('seen')
      pic.seen = true
      Pages.updateActive()
      index = pic.index
      mainImage.src = `/images/full${pic.path}`
      mainImage.setAttribute('data-path', pic.path)
      postJSON('/api/navigate/latest', { path: pic.path })
      selectElement('.status-bar .center').innerText = pic.name
      selectElement('.status-bar .left').innerText = `(${(index + 1).toLocaleString()}/${picturereaderdata.pictures.count.toLocaleString()})`
      selectElement('.status-bar .right').innerText = `(${Math.floor(100 * (index + 1) / picturereaderdata.pictures.count).toLocaleString()}%)`
    }

    mainImage.addEventListener('load', () => {
      loadingScreen.style.display = 'none'
    })
    mainImage.addEventListener('error', showError)
    if (picturereaderdata.pictures.count) {
      loadingScreen.style.display = null
      loadImage(pics[index])
    } else {
      mainImage.style.display = 'none'
    }

    const changeImage = (predicate, changeToIndex) => {
      if (loadingScreen.style.display !== 'none') {
        return
      }
      if (predicate && changeToIndex >= 0 && changeToIndex < pics.length) {
        loadImage(pics[changeToIndex])
        MainMenu.hide()
      } else {
        showError()
      }
    }

    for (const picture of selectElements('#pictures .card.picture')) {
      picture.addEventListener('click', () => changeImage(true, +picture.attributes['data-index'].value))
    }

    const getUnseenIndex = (preFilter, selector) => {
      let candidates = pics.filter(pic => !pic.seen && preFilter(pic))
      if (candidates.length) {
        return selector(candidates).index
      }
      candidates = pics.filter(pic => !pic.seen)
      if (candidates.length) {
        return selector(candidates).index
      }
      return -1
    }

    return {
      first: () => changeImage(true, 0),
      previous: () => (ImageNavigation.IsShowUnseen() ? Images.previousUnseen : Images.previousImage)(),
      previousImage: () => changeImage(index > 0, index - 1),
      previousUnseen: () => changeImage(
        pics.some(pic => !pic.seen),
        getUnseenIndex(
          pic => pic.index < index,
          candidates => candidates.pop()
        )),
      next: () => (ImageNavigation.IsShowUnseen() ? Images.nextUnseen : Images.nextImage)(),
      nextImage: () => changeImage(index < pics.length - 1, index + 1),
      nextUnseen: () => changeImage(
        pics.some(pic => !pic.seen),
        getUnseenIndex(
          pic => pic.index > index,
          candidates => candidates.shift()
        )),
      last: () => changeImage(true, pics.length - 1),
      random: () => changeImage(true, Math.floor(Math.random() * pics.length)),
      viewFullSize: () => window.open(`/images/full${pics[index].path}`),
      reload: () => reloadData().then(() => changeImage(true, index))
    }
  })()

  const MainMenu = (() => {
    const mainMenu = selectElement('#mainMenu')
    const menuButton = selectElement('#mainMenuItem')
    const canHide = () => picturereaderdata.pictures.count > 0 && mainMenu.style.display !== 'none'
    let showMenu = !canHide()
    showMenu |= picturereaderdata.pictures.pages.flat().every(pic => pic.seen)
    showMenu &= !/noMenu/.test(window.location.search)
    if (!showMenu) {
      mainMenu.style.display = 'none'
    }

    window.history.replaceState(null, '', `${window.location.origin}${window.location.pathname}`)
    Tabs.select(picturereaderdata.pictures.count ? '#pictures' : '#navigation')

    menuButton.addEventListener('click', () => MainMenu.toggle())
    return {
      isVisible: () => !(mainMenu.style.display === 'none'),
      show: () => {
        Pages.updateActive()
        mainMenu.style.display = null
      },
      hide: () => {
        if (canHide()) {
          mainMenu.style.display = 'none'
        }
      },
      toggle: () => {
        if (MainMenu.isVisible()) {
          MainMenu.hide()
        } else {
          MainMenu.show()
        }
      }
    }
  })()

  const Actions = (() => {
    const actions = {
      first: Images.first,
      previous: Images.previous,
      previousImage: Images.previousImage,
      previousUnseen: Images.previousUnseen,
      next: Images.next,
      nextImage: Images.nextImage,
      nextUnseen: Images.nextUnseen,
      last: Images.last,
      random: Images.random,
      viewFullSize: Images.viewFullSize,
      parentFolder: () => {
        if (picturereaderdata.parent) {
          window.location = `/show${picturereaderdata.parent}`
        } else {
          showError()
        }
      },
      previousFolder: () => {
        if (picturereaderdata.prev && picturereaderdata.prev.path) {
          window.location = `/show${picturereaderdata.prev.path}`
        } else {
          showError()
        }
      },
      nextFolder: () => {
        if (picturereaderdata.next && picturereaderdata.next.path) {
          window.location = `/show${picturereaderdata.next.path}`
        } else {
          showError()
        }
      },
      fullscreen: () => {
        if (!window.document.fullscreenElement) {
          window.document.body.requestFullscreen()
        } else {
          window.document.exitFullscreen()
        }
        MainMenu.hide()
      },
      slideshow: () => {
        window.location.pathname = `/slideshow${picturereaderdata.path}`
      },
      markAllSeen: () => postJSON('/api/mark/read', { path: picturereaderdata.path }).finally(() => Images.reload()),
      markAllUnseen: () => postJSON('/api/mark/unread', { path: picturereaderdata.path }).finally(() => Images.reload()),
      bookmark: Bookmarks.add
    }
    for (const button of selectElements('.action-block .action-button')) {
      button.addEventListener('click', evt => {
        const action = evt.currentTarget.attributes['data-action'].value
        if (actions[action]) {
          actions[action]()
        }
      })
    }
    return actions
  })();

  (() => {
    const actions = {
      ARROWUP: MainMenu.show,
      ARROWDOWN: MainMenu.show,
      ARROWRIGHT: Actions.next,
      ARROWLEFT: Actions.previous,
      HOME: Actions.first,
      END: Actions.last
    }
    const menuActions = {
      ARROWUP: MainMenu.hide,
      ARROWDOWN: MainMenu.hide
    }
    const executeKey = key => {
      if (MainMenu.isVisible()) {
        (menuActions[key] || (() => 0))()
      } else {
        (actions[key] || (() => 0))()
      }
    }

    document.onkeyup = evt => {
      const key = (evt.ctrlKey ? '<CTRL>' : '') +
      (evt.altKey ? '<ALT>' : '') +
      (evt.shiftKey ? '<SHIFT>' : '') +
      evt.key.toUpperCase()
      executeKey(key)
    }

    const initialScale = window.visualViewport ? window.visualViewport.scale : 1
    const image = selectElement('#mainImage')

    image.addEventListener('click', evt => {
      if (window.visualViewport && window.visualViewport.scale > initialScale) {
        return
      }
      const pageWidth = window.innerWidth || document.body.clientWidth
      const x = evt.pageX
      if (x < pageWidth / 3) {
        executeKey('ARROWLEFT')
      } else if (x < pageWidth * 2 / 3) {
        executeKey('ARROWUP')
      } else {
        executeKey('ARROWRIGHT')
      }
    })
  })()
})()
