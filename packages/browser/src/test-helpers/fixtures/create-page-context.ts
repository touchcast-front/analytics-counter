import { PageContext, PAGE_CTX_DISCRIMINANT } from '../../core/page'

const pageCtxFixture: PageContext = {
  __type: PAGE_CTX_DISCRIMINANT,
  path: '/',
  referrer: '',
  search: '',
  title: '',
  url: 'http://localhost/',
}

export const createPageCtx = (ctx: Partial<PageContext> = {}): PageContext => ({
  ...pageCtxFixture,
  ...ctx,
})
