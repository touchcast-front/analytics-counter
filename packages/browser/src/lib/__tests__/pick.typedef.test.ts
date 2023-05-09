import { assertNotAny, assertIs } from '../../test-helpers/type-assertions'
import { pick } from '../pick'

export default () => {
  // expect: Pick<{
  //     name: number;
  // }, "name">
  const r1 = pick({ name: 123 }, ['name'])

  assertIs<{ name: number }>(r1)
  assertNotAny(r1)

  // expect: Partial<{ name: number }>
  const r2 = pick({ name: 123 }, [] as string[])
  assertNotAny(r2)

  assertIs<Partial<{ name: number }>>(r2)
  // @ts-expect-error - should be partial
  assertIs<{ name: number }>(r2)

  // expect: Partial<{}>
  const r3 = pick({}, ['name'])
  assertNotAny(r3)
  // @ts-expect-error - should ne empty
  assertIs<{ name: any }>(r3)
  assertIs<{}>(r3)
}
