import { CreateWrapperOptions } from '../types'

export const createConsentStampingMiddleware =
  (getCategories: CreateWrapperOptions['getCategories']) =>
  async ({ payload, next }: any) => {
    payload.obj.context.consent = {
      ...payload.obj.context.consent,
      categoryPreferences: await getCategories(),
    }
    next()
  }
