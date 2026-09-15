'use sanity'

const ACTIVE_CLASS = 'active'
const VALUE_ATTRIBUTE = 'data-value'

function optionsOf(groupSelector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`${groupSelector} button`))
}

export function selectOption(groupSelector: string, value: string): void {
  for (const option of optionsOf(groupSelector)) {
    option.classList.toggle(ACTIVE_CLASS, option.getAttribute(VALUE_ATTRIBUTE) === value)
  }
}

export function bindOptionGroup(groupSelector: string, choose: (value: string) => void): void {
  for (const option of optionsOf(groupSelector)) {
    option.addEventListener('click', (evt) => {
      const value = option.getAttribute(VALUE_ATTRIBUTE)
      if (value !== null) choose(value)
      evt.preventDefault()
    })
  }
}
