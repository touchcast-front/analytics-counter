import { CreateWrapperOptions, AnyAnalytics } from '../types'

type CreateConsentMw = (
  getCategories: CreateWrapperOptions['getCategories']
) => AnyAnalytics['addSourceMiddleware']

/**
 * Create analytics addSourceMiddleware fn that stamps each
 */
export const createConsentStampingMiddleware: CreateConsentMw =
  (getCategories) =>
  async ({ payload, next }) => {
    payload.obj.context.consent = {
      ...payload.obj.context.consent,
      categoryPreferences: await getCategories(),
    }
    next()
  }
