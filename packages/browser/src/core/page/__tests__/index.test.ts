import { getDefaultPageContext, isBufferedPageContext } from '../'

describe(isBufferedPageContext, () => {
  it('should return true if object is page context', () => {
    expect(isBufferedPageContext({})).toBe(false)
    expect(isBufferedPageContext('')).toBe(false)
    expect(isBufferedPageContext(['foo'])).toBe(false)
    expect(
      isBufferedPageContext(['http://foo.com', undefined, 'title', 'referrer'])
    ).toBe(true)
  })
  expect(
    isBufferedPageContext(['http://foo.com', 'hello', 'title', 'referrer'])
  ).toBe(true)
})

describe(getDefaultPageContext, () => {
  const el = document.createElement('link')
  el.setAttribute('rel', 'canonical')

  beforeEach(() => {
    el.setAttribute('href', '')
    document.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('handles no canonical links', () => {
    const defs = getDefaultPageContext()
    expect(defs.url).not.toBeNull()
  })

  it('handles canonical links', () => {
    el.setAttribute('href', 'http://www.segment.local')
    document.body.appendChild(el)
    const defs = getDefaultPageContext()
    expect(defs.url).toEqual('http://www.segment.local')
  })

  it('handles canonical links with a path', () => {
    el.setAttribute('href', 'http://www.segment.local/test')
    document.body.appendChild(el)
    const defs = getDefaultPageContext()
    expect(defs.url).toEqual('http://www.segment.local/test')
    expect(defs.path).toEqual('/test')
  })

  it('handles canonical links with search params in the url', () => {
    el.setAttribute('href', 'http://www.segment.local?test=true')
    document.body.appendChild(el)
    const defs = getDefaultPageContext()
    expect(defs.url).toEqual('http://www.segment.local?test=true')
  })

  it('if canonical does not exist, returns fallback', () => {
    document.body.appendChild(el)
    const defs = getDefaultPageContext()
    expect(defs.url).toEqual(window.location.href)
  })
})
