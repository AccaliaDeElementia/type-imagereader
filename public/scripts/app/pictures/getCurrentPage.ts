'use sanity'

const DEFAULT_INDEX = -1
const INCREMENT_SINGLE = 1
export function GetCurrentPage(): number {
  let i = DEFAULT_INDEX
  if (document.querySelector('.pagination .page-item.active') !== null) {
    for (const elem of document.querySelectorAll('.pagination .page-item')) {
      i += INCREMENT_SINGLE
      if (elem.classList.contains('active')) break
    }
  }
  return i
}
