import { BufferedPageContext, PageContext } from '../../core/page'

export const pageCtxFixture: PageContext = {
  path: '/',
  referrer: '',
  search: '',
  title: '',
  url: 'http://localhost/',
}

type Opts = Partial<{
  url: string
  canonical: string
  title: string
  referrer: string
}>

export const bufferedPageCtxFixture = ({
  url = 'http://localhost/',
  canonical = '',
  title = '',
  referrer = '',
}: Opts = {}): BufferedPageContext => {
  return [url, canonical, title, referrer]
}
