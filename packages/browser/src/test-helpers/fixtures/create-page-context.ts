import {
  BufferedPageContext,
  PageContext,
  PAGE_CTX_DISCRIMINANT,
} from '../../core/page'

export const pageCtxFixture: PageContext = {
  path: '/',
  referrer: '',
  search: '',
  title: '',
  url: 'http://localhost/',
}

export const bufferedPageCtxFixture: BufferedPageContext = {
  __type: PAGE_CTX_DISCRIMINANT,
  ...pageCtxFixture,
}
