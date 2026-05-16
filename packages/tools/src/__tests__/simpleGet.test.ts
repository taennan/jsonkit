import { simpleGet } from '../getset'
import { describe, expect, it } from 'vitest'

describe('simpleGet', () => {
  it('gets nested values', () => {
    const obj = { a: { b: { c: 42 } } }
    const result = simpleGet(obj, ['a', 'b', 'c'])
    expect(result).toBe(42)
  })

  it('gets nested array values', () => {
    const obj = { a: { b: [1, 2, 3] } }
    const result = simpleGet(obj, ['a', 'b', 1])
    expect(result).toBe(2)
  })
})
