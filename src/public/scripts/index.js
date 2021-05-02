/* global $, picturereaderdata */

(function Index () {
  'use sanity'

  function Actions () {
    const actionFunctions = {
      first: () => Images.first(),
      previousUnseen: () => Images.previousUnseen(),
      previousImage: () => Images.previousImage(),
      previous: () => Images.previous(),
      random: () => Images.random(),
      nextUnseen: () => Images.nextUnseen(),
      nextImage: () => Images.nextImage(),
      next: () => Images.next(),
      last: () => Images.last(),
      parentFolder: () => {
        if (picturereaderdata.parent) {
          window.location = `/show${picturereaderdata.parent}`
        } else {
          $('#mainImage').trigger('error')
        }
      },
      previousFolder: () => {
        if (picturereaderdata.prev && picturereaderdata.prev.path) {
          window.location = `/show${picturereaderdata.prev.path}`
        } else {
          $('#mainImage').trigger('error')
        }
      },
      nextFolder: () => {
        if (picturereaderdata.next && picturereaderdata.next.path) {
          window.location = `/show${picturereaderdata.next.path}`
        } else {
          $('#mainImage').trigger('error')
        }
      },
      viewFullSize: () => Images.open(),
      fullscreen: () => {
        if (!window.document.webkitFullscreenElement) {
          window.document.body.webkitRequestFullscreen()
        } else {
          window.document.webkitExitFullscreen()
        }
      },
      markAllSeen: () => $.post('/api/mark/read', { path: picturereaderdata.path }, () => window.location.reload()),
      markAllUnseen: () => $.post('/api/mark/unread', { path: picturereaderdata.path }, () => window.location.reload()),
      bookmark: () => Images.addBookmark(),
      slideshow: () => {
        window.location.pathname = `/slideshow${picturereaderdata.path}`
      }
    }
    $('.action-block .action-button').click(function () {
      const func = $(this).data('action')
      if (actionFunctions[func]) {
        actionFunctions[func]()
      }
    })
  }
  Actions()

  function MainMenu () {
    if (!picturereaderdata.children.length) {
      $('#pictures-tab').tab('show')
    }

    if (!picturereaderdata.pictures.count || picturereaderdata.pictures.pages.flat().every(pic => pic.seen)) {
      $('#mainMenu').show()
    } else {
      $('#mainImage img').show()
    }

    $('input[name=ShowUnseenOnly]').change(() => {
      window.localStorage.ShowUnseenOnly = $('input[name=ShowUnseenOnly]').prop('checked')
    })
    $('input[name=ShowUnseenOnly]').prop('checked', window.localStorage.ShowUnseenOnly === 'true')

    $('#mainMenuItem').click(MainMenu.toggle)
    MainMenu.visible = () => $('#mainMenu').is(':visible')
    MainMenu.show = () => $('#mainMenu').show()
    MainMenu.hide = () => {
      if (!picturereaderdata.pictures.count) {
        return
      }
      $('#mainMenu').hide()
    }
    MainMenu.toggle = () => {
      if (MainMenu.visible()) {
        MainMenu.hide()
      } else {
        MainMenu.show()
      }
    }
  }
  MainMenu()

  function Images () {
    $('#mainImage').on('error', () => {
      $('.navbar').addClass('ease').removeClass('bg-light').addClass('bg-danger')
      setTimeout(() => $('.navbar').addClass('bg-light'), 500)
      setTimeout(() => $('.navbar').removeClass('ease').removeClass('bg-danger'), 1000)
    })
    $('#mainImage img').on('load', () => $('#loadingScreen').hide())
    let after = () => {
      after = MainMenu.hide
    }
    const pics = picturereaderdata.pictures.pages.flat()
    let index = 0
    pics.forEach((f, i) => {
      if (f.path === picturereaderdata.cover) {
        index = i
      }
    })
    const loadImage = pic => {
      if (!pic) {
        return
      }
      $('#loadingScreen').show()
      if ($('#pictures-nav').length) {
        const page = Math.floor(index / $('#pictures-nav').data('pagesize')) + 1
        $('#pictures-nav .page-item').removeClass('active')
        $(`#pictures-nav .page-item[data-page=${page}]`).addClass('active')
        $('#pictures .page').hide()
        $(`#pictures .page[data-page=${page}]`).show()
        $(`#pictures .page[data-page=${page}] img`).each(function () {
          const src = $(this).data('src')
          if (src && $(this).attr('src') !== src) {
            $(this).attr('src', src)
          }
        })
      } else {
        $('#pictures .page').show()
        $('#pictures .page img').each(function () {
          const src = $(this).data('src')
          if (src && $(this).attr('src') !== src) {
            $(this).attr('src', src)
          }
        })
      }
      pic.seen = true
      $('title, nav .title').text(picturereaderdata.name)
      $('.status-bar .center, .description-title .title').text(pic.name)
      $('.status-bar .left').text(`(${index + 1}/${picturereaderdata.pictures.count})`)
      $.post('/api/navigate/latest', { path: pic.path })
      $('#mainImage img').attr('src', `/images/full${pic.path}`).data('path', pic.path).data('index', index)
      after()
    }
    loadImage(pics[index])

    $('#mainImage').on('error', () => {
      $('.navbar').addClass('ease').removeClass('bg-dark').addClass('bg-danger')
      setTimeout(() => $('.navbar').addClass('bg-dark'), 500)
      setTimeout(() => $('.navbar').removeClass('ease').removeClass('bg-danger'), 1000)
    })

    const changeImage = (isValid, action) => {
      if ($('#loadingScreen:visible').length) {
        return
      }
      if (isValid) {
        action()
        loadImage(pics[index])
      } else {
        $('#mainImage').trigger('error')
      }
    }

    Images.first = () => changeImage(true, () => { index = 0 })
    Images.previous = () => (window.localStorage.ShowUnseenOnly === 'true' ? Images.previousUnseen : Images.previousImage)()
    Images.previousImage = () => changeImage(index > 0, () => index--)
    Images.previousUnseen = () => changeImage(pics.some(e => !e.seen), () => {
      index = pics.reduce((acc, pic, i) => !pic.seen && i < index ? Math.max(acc, i) : acc, -1)
      if (index < 0) {
        index = pics.reduce((acc, pic, i) => !pic.seen ? Math.max(acc, i) : acc, -1)
      }
    })
    Images.next = () => (window.localStorage.ShowUnseenOnly === 'true' ? Images.nextUnseen : Images.nextImage)()
    Images.nextUnseen = () => changeImage(pics.some((e) => !e.seen), () => {
      index = pics.reduce((acc, pic, i) => !pic.seen && i > index ? Math.min(acc, i) : acc, Infinity)
      if (!isFinite(index)) {
        index = pics.reduce((acc, pic, i) => !pic.seen ? Math.min(acc, i) : acc, Infinity)
      }
    })
    Images.nextImage = () => changeImage(index < pics.length - 1, () => index++)
    Images.last = () => changeImage(true, () => { index = pics.length - 1 })
    Images.random = () => changeImage(true, () => { index = Math.floor(Math.random() * pics.length) })
    Images.open = () => window.open(`/images/full${pics[index].path}`)
    Images.addBookmark = () => Bookmarks.add(pics[index].path)

    $('#pictures .card.picture').click(function () {
      changeImage(true, () => { index = +$(this).data('index') })
    })

    $('#pictures-nav .page-item').click(function () {
      const current = $('#pictures-nav .page-item.active').data('page')
      const pages = $('#pictures-nav').data('pages')
      let page = $(this).data('page')
      if (page === 'next') {
        page = current < pages ? current + 1 : null
      } else if (page === 'prev') {
        page = current > 1 ? current - 1 : null
      } else {
        page = +page
      }
      if (!page || Number.isNaN(page)) {
        $('#mainImage').trigger('error')
        return
      }
      $('#pictures-nav .page-item').removeClass('active')
      $(`#pictures-nav .page-item[data-page=${page}]`).addClass('active')
      $('#pictures .page').hide()
      $(`#pictures .page[data-page=${page}]`).show()
      $(`#pictures .page[data-page=${page}] img`).each(function () {
        const src = $(this).data('src')
        if (src && $(this).attr('src') !== src) {
          $(this).attr('src', src)
        }
      })
    })
  }
  Images()

  function Bookmarks () {
    Bookmarks.add = (path) => $.post('/api/bookmarks/add', { path }, () => window.location.reload())
    Bookmarks.remove = (path) => $.post('/api/bookmarks/remove', { path }, () => window.location.reload())
    Bookmarks.go = (path, folder) => $.post('/api/navigate/latest', { path }, window.location.assign(`/show${folder}`))
    $('.bookmark .btn.remove').click((e) => Bookmarks.remove($(e.target).data('path')))
    $('.bookmark').click((e) => Bookmarks.go($(e.currentTarget).data('path'), $(e.currentTarget).data('folder')))
  }
  Bookmarks()

  function MouseFingers () {
    const initialScale = window.visualViewport ? window.visualViewport.scale : 1
    let pendingTouch = null

    $('#mainImage').on('touchstart', event => {
      if (!pendingTouch) {
        pendingTouch = event.originalEvent.changedTouches[0]
      }
    }).on('touchend', event => {
      const touch = event.originalEvent.changedTouches[0]
      if (pendingTouch && pendingTouch.identifier === touch.identifier) {
        if (!window.visualViewport || window.visualViewport.scale <= initialScale) {
          handleGesture(pendingTouch, touch)
        }
        pendingTouch = null
      }
    }).on('click', evt => {
      if (MainMenu.visible()) {
        MainMenu.hide()
        return
      }
      if (window.visualViewport && window.visualViewport.scale > initialScale) {
        return
      }
      const pageWidth = window.innerWidth || document.body.clientWidth
      const x = evt.pageX
      if (x < pageWidth / 3) {
        Images.previous()
      } else if (x < pageWidth * 2 / 3) {
        MainMenu.show()
      } else {
        Images.next()
      }
    })

    const handleGesture = (startTouch, endTouch) => {
      const limit = Math.tan(45 * 1.5 / 180 * Math.PI) // 45 degrees
      const pageWidth = window.innerWidth || document.body.clientWidth
      const treshold = Math.max(25, Math.floor(0.02 * (pageWidth)))
      const swipeX = endTouch.screenX - startTouch.screenX
      const swipeY = endTouch.screenY - startTouch.screenY
      const swipeVertical = Math.abs(swipeX / swipeY) <= limit
      const swipeHorizontal = Math.abs(swipeY / swipeX) <= limit
      if (Math.abs(swipeX) > treshold || Math.abs(swipeY) > treshold) {
        if (swipeHorizontal) {
          if (swipeX > 0) {
            Images.previous()
          } else {
            Images.next()
          }
        }
        if (swipeVertical) {
          if (swipeY > 0) {
            MainMenu.show()
          }
        }
      } else {
        if (endTouch.screenX < pageWidth / 3) {
          // navigation.prevImage()
        } else if (endTouch.screenX < pageWidth * 2 / 3) {
          // $('#mainMenu').trigger('showMenu')
        } else {
          // navigation.nextImage()
        }
      }
    }
  }
  MouseFingers()

  function Keebs () {
    document.onkeyup = (evt) => {
      let keys = {
        ARROWUP: MainMenu.show,
        ARROWDOWN: MainMenu.hide,
        ARROWRIGHT: Images.next,
        ARROWLEFT: Images.previous,
        HOME: Images.first,
        END: Images.last
      }
      if (MainMenu.visible()) {
        keys = {
          ARROWDOWN: MainMenu.hide()
        }
      }
      const key = (evt.ctrlKey ? '<CTRL>' : '') +
          (evt.altKey ? '<ALT>' : '') +
          (evt.shiftKey ? '<SHIFT>' : '') +
          evt.key.toUpperCase()
      const action = keys[key] || (() => true)
      action()
    }
  }
  Keebs()
})()
