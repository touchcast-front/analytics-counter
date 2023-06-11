import { AnalyticsBrowser } from '@segment/analytics-next'
import { createWrapper } from '@segment/analytics-consent-tools'

const fakeCategories = { Advertising: true, Analytics: true }

const wrap = createWrapper({
  /* Load + Get initial categories */
  shouldLoad: () => Promise.resolve(fakeCategories),
  /* Stamp categories on every event */
  getCategories: () => fakeCategories,
  integrationCategoryMappings: {
    Fullstory: ['Foo'],
  },
})

export const analytics = new AnalyticsBrowser()
;(window as any).analytics = analytics

wrap(analytics)

analytics.load({ writeKey: '9lSrez3BlfLAJ7NOChrqWtILiATiycoc' })
console.log('wrapped.')
