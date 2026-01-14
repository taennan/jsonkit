import { JsonPatchBuilder } from '../builder'
import { JsonPatcher } from '../patcher'

describe('JsonPatcher', () => {
  describe('constructor', () => {
    it('creates a new instance with static new method', () => {
      const patcher = new JsonPatcher()
      expect(patcher).toBeInstanceOf(JsonPatcher)
    })
  })

  describe('patch', () => {
    it('patches strings by appending via add operations', () => {
      const patcher = new JsonPatcher()
      const target = {
        text: 'a',
      }
      const patches = new JsonPatchBuilder()
        .add('text', 'b')
        .add('text', 'c')
        .add('text', 'de')
        .patches()
      const expected = {
        text: 'abcde',
      }

      const actual = patcher.patch(target, patches)
      expect(actual).toEqual(expected)
    })

    it('does not mutate the original object', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John', age: 30 }
      const patches = new JsonPatchBuilder().replace('name', 'Jane').patches()

      const result = patcher.patch(target, patches)

      expect(target).toEqual({ name: 'John', age: 30 })
      expect(result).toEqual({ name: 'Jane', age: 30 })
    })

    it('handles add operations', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John' }
      const patches = new JsonPatchBuilder().add('age', 30).patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ name: 'John', age: 30 })
    })

    it('handles replace operations', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John', age: 30 }
      const patches = new JsonPatchBuilder().replace('name', 'Jane').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ name: 'Jane', age: 30 })
    })

    it('handles remove operations', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John', age: 30 }
      const patches = new JsonPatchBuilder().remove('age').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ name: 'John' })
    })

    it('handles move operations', () => {
      const patcher = new JsonPatcher()
      const target = { oldName: 'John', age: 30 }
      const patches = new JsonPatchBuilder().move('oldName', 'newName').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ newName: 'John', age: 30 })
    })

    it('handles copy operations', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John', age: 30 }
      const patches = new JsonPatchBuilder().copy('name', 'backup').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ name: 'John', age: 30, backup: 'John' })
    })

    it('handles test operations', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John', age: 30 }
      const patches = new JsonPatchBuilder().test('name', 'John').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ name: 'John', age: 30 })
    })

    it('handles nested object operations', () => {
      const patcher = new JsonPatcher()
      const target = { user: { name: 'John', age: 30 } }
      const patches = new JsonPatchBuilder().replace(['user', 'name'], 'Jane').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ user: { name: 'Jane', age: 30 } })
    })

    it('handles array operations', () => {
      const patcher = new JsonPatcher()
      const target = { users: ['John', 'Jane'] }
      const patches = new JsonPatchBuilder().add(['users', 2], 'Bob').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ users: ['John', 'Jane', 'Bob'] })
    })

    it('handles complex nested operations', () => {
      const patcher = new JsonPatcher()
      const target = {
        users: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      }
      const patches = new JsonPatchBuilder()
        .replace(['users', 0, 'age'], 31)
        .add(['users', 1, 'email'], 'jane@example.com')
        .patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({
        users: [
          { name: 'John', age: 31 },
          { name: 'Jane', age: 25, email: 'jane@example.com' },
        ],
      })
    })

    it('handles multiple operations in sequence', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John', age: 30 }
      const patches = new JsonPatchBuilder()
        .replace('name', 'Jane')
        .add('email', 'jane@example.com')
        .remove('age')
        .patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ name: 'Jane', email: 'jane@example.com' })
    })

    it('handles string concatenation with non-string target', () => {
      const patcher = new JsonPatcher()
      const target = { count: 5 }
      const patches = new JsonPatchBuilder().add('count', 'more').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ count: 'more' })
    })

    it('handles empty patches array', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John' }
      const patches: any[] = []

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ name: 'John' })
    })

    it('handles null and undefined values', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John' }
      const patches = new JsonPatchBuilder()
        .add('nullValue', null)
        .add('undefinedValue', undefined)
        .patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({
        name: 'John',
        nullValue: null,
        undefinedValue: undefined,
      })
    })
  })

  describe('safePatch', () => {
    it('returns success result for valid patch', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John' }
      const patches = new JsonPatchBuilder().replace('name', 'Jane').patches()

      const result = patcher.safePatch(target, patches)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ name: 'Jane' })
      }
    })

    it('returns error result for invalid patch', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John' }
      const patches = new JsonPatchBuilder().replace('/nonexistent', 'test').patches()

      const result = patcher.safePatch(target, patches)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error)
      }
    })

    it('handles test operation failure', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John' }
      const patches = new JsonPatchBuilder().test('name', 'Jane').patches()

      const result = patcher.safePatch(target, patches)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error)
      }
    })

    it('preserves original object on error', () => {
      const patcher = new JsonPatcher()
      const target = { name: 'John' }
      const patches = new JsonPatchBuilder().remove('nonexistent').patches()

      const result = patcher.safePatch(target, patches)

      expect(target).toEqual({ name: 'John' })
      expect(result.success).toBe(false)
    })
  })

  describe('string concatenation behavior', () => {
    it('concatenates strings when adding to existing string field', () => {
      const patcher = new JsonPatcher()
      const target = { text: 'hello' }
      const patches = new JsonPatchBuilder().add('text', ' world').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ text: 'hello world' })
    })

    it('concatenates multiple string additions in sequence', () => {
      const patcher = new JsonPatcher()
      const target = { message: 'Hello' }
      const patches = new JsonPatchBuilder()
        .add('message', ' beautiful')
        .add('message', ' world')
        .add('message', '!')
        .patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ message: 'Hello beautiful world!' })
    })

    it('concatenates empty string to existing string', () => {
      const patcher = new JsonPatcher()
      const target = { text: 'hello' }
      const patches = new JsonPatchBuilder().add('text', '').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ text: 'hello' })
    })

    it('concatenates string to empty string', () => {
      const patcher = new JsonPatcher()
      const target = { text: '' }
      const patches = new JsonPatchBuilder().add('text', 'world').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ text: 'world' })
    })

    it('does not concatenate when adding to non-string field', () => {
      const patcher = new JsonPatcher()
      const target = { count: 5 }
      const patches = new JsonPatchBuilder().add('count', 'suffix').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ count: 'suffix' })
    })

    it('does not concatenate when adding non-string value', () => {
      const patcher = new JsonPatcher()
      const target = { text: 'hello' }
      const patches = new JsonPatchBuilder().add('text', 123).patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ text: 123 })
    })

    it('handles string concatenation with special characters', () => {
      const patcher = new JsonPatcher()
      const target = { text: 'hello' }
      const patches = new JsonPatchBuilder()
        .add('text', '\n')
        .add('text', 'world')
        .add('text', '!')
        .patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ text: 'hello\nworld!' })
    })

    it('handles string concatenation with unicode characters', () => {
      const patcher = new JsonPatcher()
      const target = { text: 'Hello' }
      const patches = new JsonPatchBuilder().add('text', ' 🌍').add('text', ' 世界').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ text: 'Hello 🌍 世界' })
    })

    it('handles nested string concatenation', () => {
      const patcher = new JsonPatcher()
      const target = { user: { name: 'John' } }
      const patches = new JsonPatchBuilder()
        .add(['user', 'name'], ' Doe')
        .add(['user', 'name'], ' Jr.')
        .patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ user: { name: 'John Doe Jr.' } })
    })
  })

  describe('edge cases', () => {
    it('handles deeply nested paths', () => {
      const patcher = new JsonPatcher()
      const target = {
        level1: {
          level2: {
            level3: {
              level4: 'deep',
            },
          },
        },
      }
      const patches = new JsonPatchBuilder()
        .replace(['level1', 'level2', 'level3', 'level4'], 'deeper')
        .patches()

      const result = patcher.patch(target, patches)
      expect(result.level1.level2.level3.level4).toBe('deeper')
    })

    it('handles array index operations', () => {
      const patcher = new JsonPatcher()
      const target = { items: ['a', 'b', 'c'] }
      const patches = new JsonPatchBuilder().replace(['items', 1], 'modified').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ items: ['a', 'modified', 'c'] })
    })

    it('handles special characters in paths', () => {
      const patcher = new JsonPatcher()
      const target = { 'special-key': 'value' }
      const patches = new JsonPatchBuilder().replace('special-key', 'new-value').patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ 'special-key': 'new-value' })
    })

    it('handles mixed operation types with string concatenation', () => {
      const patcher = new JsonPatcher()
      const target = {
        name: 'John',
        message: 'Hello',
        age: 30,
      }
      const patches = new JsonPatchBuilder()
        .add('message', ' world')
        .replace('name', 'Jane')
        .add('message', '!')
        .remove('age')
        .patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({
        name: 'Jane',
        message: 'Hello world!',
      })
    })

    it('handles array operations with string concatenation', () => {
      const patcher = new JsonPatcher()
      const target = { messages: ['Hello', 'World'] }
      const patches = new JsonPatchBuilder()
        .add(['messages', 0], ' there')
        .add(['messages', 1], '!')
        .patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ messages: ['Hello there', 'World!'] })
    })

    it('handles object and array values in add operations', () => {
      const patcher = new JsonPatcher()
      const target = { data: 'prefix' }
      const patches = new JsonPatchBuilder().add('data', { nested: 'object' }).patches()

      const result = patcher.patch(target, patches)
      expect(result).toEqual({ data: { nested: 'object' } })
    })
  })
})
