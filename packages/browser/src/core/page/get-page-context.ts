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

/**
 * Infer the search params from the URL if the URL includes search parameters
 */
export const createSearchParams = (
  search: string | undefined,
  url: string | undefined
): string => {
  if (search !== undefined) {
    return search
  } else if (url) {
    return new URL(url).search
  } else {
    return ''
  }
}

// why are we appending search parameters to the canonical URL -- like, whyyy would this be a thing?
const createCanonicalURL = (canonicalUrl: string, searchParams: string) => {
  return canonicalUrl.indexOf('?') > -1
    ? canonicalUrl
    : canonicalUrl + searchParams
}

const removeHash = (href: string) => {
  const hashIdx = href.indexOf('#')
  return hashIdx === -1 ? href : href.slice(0, hashIdx)
}

const formatCanonicalPath = (canonicalUrl: string) => {
  const a = document.createElement('a')
  a.href = canonicalUrl
  // why are we removing a trailing slash from canonical only (???)
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
    ? createCanonicalURL(canonicalUrl, search)
    : removeHash(urlHref)
  // Why are we removing the anchor here but not the canonical URL? Also, why don't we include hash or any anchor arguments. (???)
  // There's no way for a customer to get access to hash arguments without overriding url =S

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
  const canonicalUrl = canonEl && canonEl.getAttribute('href')
  const searchParams = location.search
  return {
    __type: 'page_ctx',
    path: (function () {
      if (!canonicalUrl) return window.location.pathname
      const a = document.createElement('a')
      a.href = canonicalUrl
      return a.pathname[0] === '/' ? a.pathname : '/' + a.pathname // WHY are we only removing trailing slashes for canonical URL paths (and not other paths)? Why would this be desirable in the first place
    })(),
    referrer: document.referrer,
    search: searchParams,
    title: document.title,
    url: (function () {
      if (canonicalUrl)
        return canonicalUrl.indexOf('?') > -1 // WHY are we deciding that canonical URL is not 'canonical enough' so we're just appending search parameters to it -- this is totally unexpected behavior.
          ? canonicalUrl
          : canonicalUrl + searchParams
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
