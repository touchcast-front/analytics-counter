/**
 * Pipe function
 * @example pipe(fn1, fn2, fn3)(value) // fn3(fn2(fn1(value)))
 */
export const pipe = <T extends any[], U>(
  fn1: (...args: T) => U,
  ...fns: Array<(a: U) => U>
) => {
  const piped = fns.reduce(
    (prevFn, nextFn) => (value: U) => nextFn(prevFn(value)),
    (value) => value
  )
  return (...args: T) => piped(fn1(...args))
}
