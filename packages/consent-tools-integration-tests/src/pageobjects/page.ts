import assert from 'assert'
class Page {
  async load(): Promise<void> {
    assert(browser.options.baseUrl)

    await browser.url(browser.options.baseUrl)

    await browser.waitUntil(
      () => browser.execute(() => document.readyState === 'complete'),
      {
        timeout: 10000,
      }
    )
  }
}

export default new Page()
