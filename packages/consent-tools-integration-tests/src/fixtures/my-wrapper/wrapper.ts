import { createWrapper } from '@segment/analytics-consent-tools'

const fakeCategories = { Advertising: true, Analytics: true }

export const wrap = createWrapper({
  /* Load + Get initial categories */
  shouldLoad: () => Promise.resolve(fakeCategories),
  /* Stamp categories on every event */
  getCategories: () => fakeCategories,
})
