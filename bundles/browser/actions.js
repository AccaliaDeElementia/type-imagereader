'use sanity'

const pubsub = require('./pubsub')

const createButtons = (buttons) => {
  const result = document.createElement('div')
  result.classList.add('actions')
  for (const { name, image } of buttons) {
    const button = document.querySelector('#ActionCard')
      .content.cloneNode(true).firstChild
    button.querySelector('i').innerText = image
    button.querySelector('h5').innerText = name
    button.addEventListener('click', event => {
      pubsub.publish('action.execute', name.replace(/\s+/g, ''))
      event.preventDefault()
      return false
    })
    result.appendChild(button)
  }
  return result
}
const actionGroups = {
  '#tabImages': [
    [
      {
        name: 'Previous Image',
        image: 'fast_rewind'
      }, {
        name: 'Previous Unseen',
        image: 'chevron_left'
      }, {
        name: 'Fullscreen',
        image: 'fullscreen'
      }, {
        name: 'Next Unseen',
        image: 'chevron_right'
      }, {
        name: 'Next Image',
        image: 'fast_forward'
      }
    ], [
      {
        name: 'Previous Folder',
        image: 'first_page'
      }, {
        name: 'Parent Folder',
        image: 'folder'
      }, {
        name: 'View Full Size',
        image: 'open_in_new'
      }, {
        name: 'Bookmark',
        image: 'bookmarks'
      }, {
        name: 'Next Folder',
        image: 'last_page'
      }
    ]
  ],
  '#tabActions': [
    [
      {
        name: 'First',
        image: 'skip_previous'
      }, {
        name: 'Previous Image',
        image: 'fast_rewind'
      }, {
        name: 'Fullscreen',
        image: 'fullscreen'
      }, {
        name: 'Next Image',
        image: 'fast_forward'
      }, {
        name: 'Last',
        image: 'skip_next'
      }
    ], [
      {
        name: 'Previous Folder',
        image: 'first_page'
      }, {
        name: 'Previous Unseen',
        image: 'chevron_left'
      }, {
        name: 'View Full Size',
        image: 'open_in_new'
      }, {
        name: 'Next Unseen',
        image: 'chevron_right'
      }, {
        name: 'Next Folder',
        image: 'last_page'
      }
    ], [
      {
        name: 'Mark All Seen',
        image: 'check_box'
      }, {
        name: 'Parent Folder',
        image: 'folder'
      }, {
        name: 'Bookmark',
        image: 'bookmarks'
      }, {
        name: 'Slideshow',
        image: 'slideshow'
      }, {
        name: 'Mark All Unseen',
        image: 'check_box_outline_blank'
      }
    ]
  ]
}

const buildActions = () => {
  for (const target in actionGroups) {
    const existing = document.querySelectorAll(`${target} .actions`)
    for (const elem of existing) {
      elem.parentElement.removeChild(elem)
    }
    for (const row of actionGroups[target]) {
      const container = createButtons(row)
      document.querySelector(target).appendChild(container)
    }
  }
}
buildActions()

pubsub.subscribe('navigate.data', (data) => {
  if (
    !(data.children && data.children.length) &&
    !(data.pictures && data.pictures.length)
  ) {
    pubsub.publish('selectTab', '#tabActions')
  }
})

module.exports = {
  createButtons
}

document.onkeyup = evt => {
  const key = (evt.ctrlKey ? '<CTRL>' : '') +
  (evt.altKey ? '<ALT>' : '') +
  (evt.shiftKey ? '<SHIFT>' : '') +
  evt.key.toUpperCase()
  pubsub.publish('action.keypress', key)
  console.log(key)
}
