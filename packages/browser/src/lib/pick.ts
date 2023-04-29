/**
 * @example
 * pick({ 'a': 1, 'b': '2', 'c': 3 }, ['a', 'c'])
 * => { 'a': 1, 'c': 3 }
 */
export const pick = <T>(object: T, keys: string[]): Partial<T> =>
  Object.assign(
    {},
    ...keys.map((key) => {
      if (object && Object.prototype.hasOwnProperty.call(object, key)) {
        return { [key]: (object as any)[key] }
      }
    })
  )
