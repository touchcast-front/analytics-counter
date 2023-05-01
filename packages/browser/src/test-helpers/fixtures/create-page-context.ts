import { BufferedPageContext, PAGE_CTX_DISCRIMINANT } from '../../core/page'

const pageCtxFixture: BufferedPageContext = {
  __type: PAGE_CTX_DISCRIMINANT,
  path: '/',
  referrer: '',
  search: '',
  title: '',
  url: 'http://localhost/',
}

export const createPageCtx = (
  ctx: Partial<BufferedPageContext> = {}
): BufferedPageContext => ({
  ...pageCtxFixture,
  ...ctx,
})
