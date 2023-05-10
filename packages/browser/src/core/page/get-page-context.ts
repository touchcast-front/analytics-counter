export interface PageContext {
  path: string
  referrer: string
  search: string
  title: string
  url: string
}

export type BufferedPageContext = [
  url: string,
  canonical: string | undefined,
  title: string,
  referrer: string
]

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

//  Legacy WTF: why are we appending search parameters to the canonical URL -- is the canonical URL "not canonical enough??"
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
  // Legacy WTF: why are we removing a trailing slash from canonical only (???)
  return a.pathname[0] === '/' ? a.pathname : '/' + a.pathname
}

export const createPageContext = ([
  urlHref,
  canonicalUrl,
  title,
  referrer,
]: BufferedPageContext): PageContext => {
  const u = new URL(urlHref)
  const path = canonicalUrl ? formatCanonicalPath(canonicalUrl) : u.pathname
  const url = canonicalUrl
    ? createCanonicalURL(canonicalUrl, u.search)
    : removeHash(urlHref)
  const search = createSearchParams(u.search, u.href)

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
// export interface BufferedPageContext extends PageContext {
//   __type: typeof PAGE_CTX_DISCRIMINANT
// }
// export const PAGE_CTX_DISCRIMINANT = 'page_ctx'

// export function isBufferedPageContext(v: unknown): v is BufferedPageContext {
//   return (
//     typeof v === 'object' &&
//     v !== null &&
//     '__type' in v &&
//     (v.__type as BufferedPageContext['__type']) === PAGE_CTX_DISCRIMINANT
//   )
// }

export function isBufferedPageContext(v: unknown): v is BufferedPageContext {
  return Array.isArray(v) && v.length === 4
}

export function createBufferedPageContext({
  url,
  canonicalUrl,
  title,
  referrer,
}: {
  url: string
  canonicalUrl?: string
  title: string
  referrer: string
}): BufferedPageContext {
  return [url, canonicalUrl, title, referrer]
}

export const getDefaultPageBufferedPageContext = () => {
  const c = document.querySelector("link[rel='canonical']")
  return createBufferedPageContext({
    url: location.href,
    canonicalUrl: (c && c.getAttribute('href')) || undefined,
    title: document.title,
    referrer: document.referrer,
  })
}

/**
 * Get page properties from the browser window/document.
 */
export function getDefaultPageContext(): PageContext {
  return createPageContext(getDefaultPageBufferedPageContext())
}
