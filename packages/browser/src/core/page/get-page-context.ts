/**
 * Represents the PageContext at the moment of event creation.
 *
 * This "__type" key is helpful because this object is also constructed via the snippet.
 * Given that we use a lot of crazt positional arguments,
 * distinguishing between regular properties objects and this page object can potentially be difficult.
 */
export interface PageContext {
  __type?: typeof PAGE_CTX_DISCRIMINANT
  path: string
  referrer: string
  search: string
  title: string
  url: string
}
export const PAGE_CTX_DISCRIMINANT = 'page_ctx'

export function isPageContext(v: unknown): v is PageContext {
  return (
    typeof v === 'object' &&
    v !== null &&
    '__type' in v &&
    (v.__type as PageContext['__type']) === PAGE_CTX_DISCRIMINANT
  )
}

/**
 * Get page properties from the browser window/document.
 *
 */
export function getPageContext(): PageContext {
  // Note: Any changes to this function should be copy+pasted into the @segment/snippet package!
  // es5-only syntax + methods
  const canonEl = document.querySelector("link[rel='canonical']")
  const canonicalPath = canonEl && canonEl.getAttribute('href')
  const searchParams = location.search
  return {
    __type: 'page_ctx',
    path: (function () {
      if (!canonicalPath) return window.location.pathname
      const a = document.createElement('a')
      a.href = canonicalPath
      return a.pathname[0] === '/' ? a.pathname : '/' + a.pathname
    })(),
    referrer: document.referrer,
    search: searchParams,
    title: document.title,
    url: (function () {
      if (canonicalPath)
        return canonicalPath.indexOf('?') > -1
          ? canonicalPath
          : canonicalPath + searchParams
      const url = window.location.href
      const hashIdx = url.indexOf('#')
      return hashIdx === -1 ? url : url.slice(0, hashIdx)
    })(),
  }
}
