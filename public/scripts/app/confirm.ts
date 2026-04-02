'use sanity'

export const Confirm = {
  dialogElement: null as HTMLElement | null,
  messageElement: null as HTMLElement | null,
  resolve: undefined as ((value: boolean) => void) | undefined,
  Show: async (message: string): Promise<boolean> => {
    if (Confirm.messageElement !== null) {
      Confirm.messageElement.innerText = message
    }
    Confirm.dialogElement?.classList.remove('hidden')
    // eslint-disable-next-line promise/avoid-new -- deferred resolution requires storing the resolver for a later button-click event
    return await new Promise<boolean>((resolve) => {
      Confirm.resolve = resolve
    })
  },
  Init: (): void => {
    Confirm.dialogElement = document.querySelector<HTMLElement>('#confirmDialog')
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
  },
}
