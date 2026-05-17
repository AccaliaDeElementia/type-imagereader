'use sanity'

describe('public/scripts/slideshow/main entry point', () => {
  it('should invoke bootstrap when the entry module is loaded', async () => {
    vi.resetModules()
    const bootstrap = vi.fn()
    vi.doMock('#public/scripts/slideshow/bootstrap.js', () => ({ bootstrap }))
    await import('#public/scripts/slideshow/main.js')
    expect(bootstrap).toHaveBeenCalled()
  })
})
