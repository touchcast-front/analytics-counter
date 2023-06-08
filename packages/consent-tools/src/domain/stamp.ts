import { CreateWrapperOptions } from '../types'

export const createConsentPrefStampMiddleware =
  (getCategories: CreateWrapperOptions['getCategories']) =>
  async ({ payload, next }: any) => {
    payload.obj.context.consent = {
      ...payload.obj.context.consent,
      categoryPreferences: await getCategories(),
    }
    next()
  }
