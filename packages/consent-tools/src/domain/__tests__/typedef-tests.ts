import { AnalyticsSnippet, AnalyticsBrowser } from '@segment/analytics-next'
import { createWrapper } from '../create-wrapper'

{
  const wrap = createWrapper({ getCategories: () => ({ foo: true }) })
  wrap({} as AnalyticsBrowser)
  wrap({} as AnalyticsSnippet)
}
