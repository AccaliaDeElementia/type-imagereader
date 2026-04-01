'use sanity'

export function GetCurrentPage(): number {
  const items = document.querySelectorAll('.pagination .page-item')
  return Array.from(items).findIndex((elem) => elem.classList.contains('active'))
}
