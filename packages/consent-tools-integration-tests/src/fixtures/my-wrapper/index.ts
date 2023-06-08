import { AnalyticsBrowser } from '@segment/analytics-next'
import { wrap } from './wrapper'

export const analytics = new AnalyticsBrowser()
;(window as any).analytics = analytics
console.log('hello')

wrap(analytics)

analytics.load({ writeKey: '9lSrez3BlfLAJ7NOChrqWtILiATiycoc' })
