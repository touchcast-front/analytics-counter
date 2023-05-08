export function pick<T extends Record<string, any>>(
  object: T,
  keys: string[]
): Partial<T>

export function pick<T extends Record<string, any>, K extends keyof T>(
  object: T,
  keys: readonly K[]
): Pick<T, K>
/**
 * @example
 * pick({ 'a': 1, 'b': '2', 'c': 3 }, ['a', 'c'])
 * => { 'a': 1, 'c': 3 }
 */
export function pick<T extends Record<string, any>>(
  object: T,
  keys: string[] | (keyof T)[] | readonly (keyof T)[]
) {
  return Object.assign(
    {},
    ...keys.map((key) => {
      if (object && Object.prototype.hasOwnProperty.call(object, key)) {
        return { [key]: object[key] }
      }
    })
  )
}
