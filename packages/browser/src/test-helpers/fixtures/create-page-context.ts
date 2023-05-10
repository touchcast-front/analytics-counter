import {
  BufferedPageContext,
  createBufferedPageContext,
  PageContext,
} from '../../core/page'

export const pageCtxFixture: PageContext = {
  path: '/',
  referrer: '',
  search: '',
  title: '',
  url: 'http://localhost/',
}

type Opts = Partial<Parameters<typeof createBufferedPageContext>[0]>

export const createBufferedPageCtxFixture = ({
  url = 'http://localhost/',
  canonicalUrl = '',
  title = '',
  referrer = '',
}: Opts = {}): BufferedPageContext => {
  return createBufferedPageContext({ url, canonicalUrl, title, referrer })
}
