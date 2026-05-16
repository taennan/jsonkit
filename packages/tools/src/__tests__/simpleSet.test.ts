import { describe, expect, it } from 'vitest'
import { simpleSet } from '../getset'

describe('simpleSet', () => {
  it('sets nested values', () => {
    const obj = { a: { b: { c: 42 } } }
    simpleSet(obj, ['a', 'b', 'c'], 43)
    expect(obj).toEqual({ a: { b: { c: 43 } } })
  })

  it('sets nested array values', () => {
    const obj = { a: { b: [1, 2, 3] } }
    simpleSet(obj, ['a', 'b', 1], 43)
    expect(obj).toEqual({ a: { b: [1, 43, 3] } })
  })

  it('sets nested object value', () => {
    class TestObject {
      constructor(readonly value: number) {}
    }
    const obj = { a: { b: { c: new TestObject(42) } } }
    simpleSet(obj, ['a', 'b', 'c', 'value'], 43)

    expect(obj).toEqual({ a: { b: { c: new TestObject(43) } } })
    expect(obj.a.b.c).toBeInstanceOf(TestObject)
  })
})
