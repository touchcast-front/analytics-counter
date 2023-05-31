import { Categories } from '../../types'
import { ValidationError } from './validation-error'

export function validateCategories(ctgs: unknown): asserts ctgs is Categories {
  if (ctgs && typeof ctgs === 'object' && !Array.isArray(ctgs)) {
    for (const k in ctgs) {
      if (typeof (ctgs as any)[k] === 'boolean') {
        return
      }
    }
  }
  throw new ValidationError(
    `Categories should be {[categoryName: string]: boolean}`,
    ctgs
  )
}

export function validateGetCategories(
  getCategories: unknown
): asserts getCategories is Function {
  if (typeof getCategories !== 'function') {
    throw new ValidationError('getCategories() is not function', getCategories)
  }
}
