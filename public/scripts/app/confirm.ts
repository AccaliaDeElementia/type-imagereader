'use sanity'

export const Confirm = {
  dialogElement: null as HTMLElement | null,
  titleElement: null as HTMLElement | null,
  messageElement: null as HTMLElement | null,
  resolve: undefined as ((value: boolean) => void) | undefined,
}

export async function show(message: string, title: string): Promise<boolean> {
  if (Confirm.titleElement !== null) {
    Confirm.titleElement.innerText = title
  }
  if (Confirm.messageElement !== null) {
    Confirm.messageElement.innerText = message
  }
  Confirm.dialogElement?.classList.remove('hidden')
  const { promise, resolve } = Promise.withResolvers<boolean>()
  Confirm.resolve = resolve
  return await promise
}

export function init(): void {
  Confirm.dialogElement = document.querySelector<HTMLElement>('#confirmDialog')
  Confirm.titleElement = document.querySelector<HTMLElement>('#confirmDialog .title')
  Confirm.messageElement = document.querySelector<HTMLElement>('#confirmDialog .message')
  document.querySelector<HTMLElement>('#confirmDialog .confirm')?.addEventListener('click', () => {
    Confirm.dialogElement?.classList.add('hidden')
    Confirm.resolve?.(true)
    Confirm.resolve = undefined
  })
  document.querySelector<HTMLElement>('#confirmDialog .cancel')?.addEventListener('click', () => {
    Confirm.dialogElement?.classList.add('hidden')
    Confirm.resolve?.(false)
    Confirm.resolve = undefined
  })
}
