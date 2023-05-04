export interface PageContext {
  path: string
  referrer: string
  search: string
  title: string
  url: string
}

// const c = document.querySelector("link[rel='canonical']")
// return [
//   document.referrer,
//   document.title,
//   window.location.href,
//   c && c.getAttribute('href'),
// ]
export type BufferedPageContext2 = [
  referrer: string,
  title: string,
  url: string,
  canonical: string | undefined
]

// return [
//   document.referrer,
//   document.title,
//   window.location.href,
//   c && c.getAttribute('href')

const formatCanonicalUrl = (canonicalPath: string, searchParams: string) => {
  return canonicalPath.indexOf('?') > -1
    ? canonicalPath
    : canonicalPath + searchParams
}

const formatUrl = (href: string) => {
  const hashIdx = href.indexOf('#')
  return hashIdx === -1 ? href : href.slice(0, hashIdx)
}

const formatCanonicalPath = (canonicalUrl: string) => {
  const a = document.createElement('a')
  a.href = canonicalUrl
  return a.pathname[0] === '/' ? a.pathname : '/' + a.pathname
}

export const sanitizePageContext2 = ([
  referrer,
  title,
  urlHref,
  canonicalUrl,
]: BufferedPageContext2): PageContext => {
  const { pathname, search } = new URL(urlHref)
  const path = canonicalUrl ? formatCanonicalPath(canonicalUrl) : pathname
  const url = canonicalUrl
    ? formatCanonicalUrl(canonicalUrl, urlHref)
    : formatUrl(urlHref)
  return {
    path,
    referrer,
    search,
    title,
    url,
  }
}
/**
 * Represents the PageContext at the moment of event creation.
 *
 * This "__type" key is helpful because this object is also constructed via the snippet.
 * Given that we use a lot of crazt positional arguments,
 * distinguishing between regular properties objects and this page object can potentially be difficult.
 */
export interface BufferedPageContext extends PageContext {
  __type: typeof PAGE_CTX_DISCRIMINANT
}
export const PAGE_CTX_DISCRIMINANT = 'page_ctx'

export function isBufferedPageContext(v: unknown): v is BufferedPageContext {
  return (
    typeof v === 'object' &&
    v !== null &&
    '__type' in v &&
    (v.__type as BufferedPageContext['__type']) === PAGE_CTX_DISCRIMINANT
  )
}

export function isBufferedPageContext2(v: unknown): v is BufferedPageContext2 {
  return Array.isArray(v) && v.length === 4
}

export const sanitizePageContext = (
  pgCtx: BufferedPageContext
): PageContext => {
  const copy = { ...pgCtx } as any
  delete copy.__type
  return copy
}

export function createBufferedPageContext(): BufferedPageContext {
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

/**
 * Get page properties from the browser window/document.
 */
export function createPageContext(): PageContext {
  return sanitizePageContext(createBufferedPageContext())
}
