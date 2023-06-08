import assert from 'assert'
const waitUntilReady = () =>
  browser.waitUntil(
    () => browser.execute(() => document.readyState === 'complete'),
    {
      timeout: 10000,
    }
  )

class Page {
  async loadIndex(): Promise<void> {
    const baseURL = browser.options.baseUrl
    assert(baseURL)
    await waitUntilReady()

    await browser.url(baseURL)
  }

  async loadOneTrust(): Promise<void> {
    const baseURL = browser.options.baseUrl
    assert(baseURL)
    await waitUntilReady()

    await browser.url(baseURL + '/onetrust.html')
  }
}

export default new Page()
