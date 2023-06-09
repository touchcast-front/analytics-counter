import { CreateWrapperOptions, AnyAnalytics } from '../types'

type CreateConsentMw = (
  getCategories: CreateWrapperOptions['getCategories'],
  disable?: CreateWrapperOptions['disableConsentRequirement']
) => AnyAnalytics['addSourceMiddleware']

/**
 * Create analytics addSourceMiddleware fn that stamps each event
 */
export const createConsentStampingMiddleware: CreateConsentMw =
  (getCategories, disable) =>
  async ({ payload, next }) => {
    if (disable && (await disable())) {
      next(payload)
      return
    }
    payload.obj.context.consent = {
      ...payload.obj.context.consent,
      categoryPreferences: await getCategories(),
    }
    next(payload)
  }
