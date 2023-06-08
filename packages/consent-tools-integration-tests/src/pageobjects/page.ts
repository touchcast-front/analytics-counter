import assert from 'assert'

const waitUntilReady = () =>
  browser.waitUntil(
    () => browser.execute(() => document.readyState === 'complete'),
    {
      timeout: 10000,
    }
  )

class Page {
  async load(page: string): Promise<void> {
    const baseURL = browser.options.baseUrl
    assert(baseURL)
    await waitUntilReady()

    await browser.url(baseURL + '/' + page)
  }
}

export default new Page()
