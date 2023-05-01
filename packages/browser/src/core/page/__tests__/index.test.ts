import {
  createBufferedPageContext,
  isBufferedPageContext,
  PAGE_CTX_DISCRIMINANT,
} from '../'

describe(isBufferedPageContext, () => {
  it('should return true if object is page context', () => {
    expect(isBufferedPageContext({})).toBe(false)
    expect(isBufferedPageContext('')).toBe(false)
    expect(isBufferedPageContext({ url: 'http://foo.com' })).toBe(false)
    expect(isBufferedPageContext({ __type: PAGE_CTX_DISCRIMINANT })).toBe(true)
  })
})

describe(createBufferedPageContext, () => {
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
    const defs = createBufferedPageContext()
    expect(defs.url).not.toBeNull()
  })

  it('handles canonical links', () => {
    el.setAttribute('href', 'http://www.segment.local')
    document.body.appendChild(el)
    const defs = createBufferedPageContext()
    expect(defs.url).toEqual('http://www.segment.local')
  })

  it('handles canonical links with a path', () => {
    el.setAttribute('href', 'http://www.segment.local/test')
    document.body.appendChild(el)
    const defs = createBufferedPageContext()
    expect(defs.url).toEqual('http://www.segment.local/test')
    expect(defs.path).toEqual('/test')
  })

  it('handles canonical links with search params in the url', () => {
    el.setAttribute('href', 'http://www.segment.local?test=true')
    document.body.appendChild(el)
    const defs = createBufferedPageContext()
    expect(defs.url).toEqual('http://www.segment.local?test=true')
  })

  it('if canonical does not exist, returns fallback', () => {
    document.body.appendChild(el)
    const defs = createBufferedPageContext()
    expect(defs.url).toEqual(window.location.href)
  })
})
