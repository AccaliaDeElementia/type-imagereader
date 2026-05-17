'use sanity'

describe('public/scripts/app/main entry point', () => {
  it('should invoke bootstrap when the entry module is loaded', async () => {
    vi.resetModules()
    const bootstrap = vi.fn()
    vi.doMock('#public/scripts/app/bootstrap.js', () => ({ bootstrap }))
    await import('#public/scripts/app/main.js')
    expect(bootstrap).toHaveBeenCalled()
  })
})
