'use sanity'

export function LoadCurrentPageImages(): void {
  for (const card of document.querySelectorAll<HTMLElement>('#tabImages .page:not(.hidden) .card')) {
    const style = card.getAttribute('data-backgroundImage')
    if (style !== null) {
      card.style.backgroundImage = style
    }
  }
}
